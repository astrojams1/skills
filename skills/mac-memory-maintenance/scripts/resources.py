#!/usr/bin/env python3
"""Private, bounded macOS RAM/storage diagnostics and stale cache cleanup."""
import argparse, collections, ctypes, datetime, fcntl, json, os, re, shlex, stat, subprocess, sys, time
from pathlib import Path

STATE = Path.home()/'Library/Application Support/CodexResourceMaintenance'
GIB = 1024**3
ERRORS = []
WARNINGS = []

def run(args, timeout=12):
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=timeout,
                           env={**os.environ,'LC_ALL':'C'})
        if p.returncode:
            detail={'command':Path(args[0]).name,'status':p.returncode}
            if Path(args[0]).name=='du': detail['target']=args[-1]
            if Path(args[0]).name=='du' and ('Operation not permitted' in p.stderr or 'Permission denied' in p.stderr):
                detail['reason']='protected_paths_omitted'; WARNINGS.append(detail)
            else: ERRORS.append(detail)
        return p.stdout
    except (OSError, subprocess.TimeoutExpired) as e:
        ERRORS.append({'command':Path(args[0]).name,'error':type(e).__name__})
        return ''

def disk():
    s = os.statvfs('/System/Volumes/Data')
    return {'available_bytes':s.f_bavail*s.f_frsize,'total_bytes':s.f_blocks*s.f_frsize}

class RUsageInfoV0(ctypes.Structure):
    """Darwin sys/resource.h RUSAGE_INFO_V0, including physical footprint."""
    _fields_ = [('uuid', ctypes.c_uint8 * 16)] + [(name, ctypes.c_uint64) for name in (
        'user_time', 'system_time', 'pkg_idle_wkups', 'interrupt_wkups', 'pageins',
        'wired_size', 'resident_size', 'phys_footprint', 'proc_start_abstime', 'proc_exit_abstime')]


def snapshot(tag):
    def ctl(key): return run(['/usr/sbin/sysctl','-n',key]).strip()
    vm = run(['/usr/bin/vm_stat'])
    page = re.search(r'page size of (\d+) bytes',vm)
    counters = {k.strip().strip('"'):int(v) for k,v in re.findall(r'^(.+?):\s+(\d+)\.?$',vm,re.M)}
    level = ctl('kern.memorystatus_vm_pressure_level')
    swap = re.search(r'used\s*=\s*([\d.]+)([KMG])',ctl('vm.swapusage'))
    boot = re.search(r'sec\s*=\s*(\d+)',ctl('kern.boottime'))
    lib = ctypes.CDLL('/usr/lib/libproc.dylib')
    lib.proc_pidpath.argtypes = [ctypes.c_int,ctypes.c_void_p,ctypes.c_uint32]
    lib.proc_pidpath.restype = ctypes.c_int
    lib.proc_pid_rusage.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_void_p]
    lib.proc_pid_rusage.restype = ctypes.c_int
    rows = []
    groups = collections.defaultdict(lambda:{'rss_bytes':0,'process_count':0,'physical_footprint_bytes':0,'footprint_process_count':0})
    # No command arguments or environment are collected or persisted.
    for line in run(['/bin/ps','-axo','pid=,ppid=,uid=,rss=,%cpu=,lstart=']).splitlines():
        p = line.split(None,5)
        if len(p)!=6: continue
        try:
            pid,ppid,uid,rss = map(int,p[:4])
            buf = ctypes.create_string_buffer(4096)
            executable = buf.value.decode('utf8','replace') if lib.proc_pidpath(pid,buf,len(buf))>0 else ''
            name = Path(executable).name or '[unknown]'
            rows.append({'pid':pid,'ppid':ppid,'uid':uid,'rss_bytes':rss*1024,'cpu_percent':float(p[4]),
                         'started':p[5].strip(),'executable':executable,'name':name})
            usage = RUsageInfoV0()
            if lib.proc_pid_rusage(pid, 0, ctypes.byref(usage)) == 0:
                rows[-1]['physical_footprint_bytes'] = usage.phys_footprint
                groups[name]['physical_footprint_bytes'] += usage.phys_footprint
                groups[name]['footprint_process_count'] += 1
            # Permission-denied/unavailable footprint stays absent, never a zero measurement.
            groups[name]['rss_bytes']+=rss*1024
            groups[name]['process_count']+=1
        except ValueError: continue
    return {'timestamp':time.time(),'local_time':datetime.datetime.now().astimezone().isoformat(),'tag':tag,
            'boot_timestamp':int(boot.group(1)) if boot else None,'ram_bytes':int(ctl('hw.memsize') or 0),
            'pressure_raw':level,'pressure':{'1':'normal','2':'warning','4':'critical'}.get(level,'unknown'),
            'swap_used_bytes':int(float(swap.group(1))*{'K':1024,'M':1024**2,'G':GIB}[swap.group(2)]) if swap else None,
            'page_size':int(page.group(1)) if page else None,'vm_pages':counters,'disk':disk(),
            'top_processes':sorted(rows,key=lambda p:max(p['rss_bytes'],p.get('physical_footprint_bytes',0)),reverse=True)[:60],
            'groups':dict(sorted(groups.items(),key=lambda kv:max(kv[1]['rss_bytes'],kv[1].get('physical_footprint_bytes',0)),reverse=True)[:30]),'errors':list(ERRORS)}

def save(s):
    folder = STATE/'samples'; folder.mkdir(exist_ok=True,mode=0o700)
    target = folder/(datetime.datetime.now().strftime('%Y-%m-%d')+'.jsonl')
    if target.exists() and target.stat().st_size>4*1024**2:
        return {'saved':False,'reason':'daily cap reached'}
    with target.open('a') as f: f.write(json.dumps(s,separators=(',',':'))+'\n')
    files = sorted(folder.glob('*.jsonl')); total = sum(p.stat().st_size for p in files)
    for p in files:
        size = p.stat().st_size
        if p!=target and (p.stat().st_mtime<time.time()-14*86400 or total>32*1024**2):
            p.unlink(); total-=size
    return {'saved':True,'path':str(target)}

def analyze():
    records = []
    for p in sorted((STATE/'samples').glob('*.jsonl')):
        for line in p.read_text().splitlines():
            try:
                s = json.loads(line)
                if s['timestamp']>=time.time()-86400: records.append(s)
            except (ValueError,KeyError): ERRORS.append({'file':p.name,'error':'invalid sample'})
    records.sort(key=lambda s:s['timestamp'])
    if not records: return {'samples':0,'errors':ERRORS}
    series = collections.defaultdict(list)
    for s in records:
        for p in s['top_processes']:
            for metric in ('rss_bytes', 'physical_footprint_bytes'):
                if metric in p:
                    series[(s['boot_timestamp'],p['pid'],p['started'],p['executable'],metric)].append((s['timestamp'],p[metric]))
    candidates = []
    for key,v in series.items():
        delta = v[-1][1]-v[0][1]; span = v[-1][0]-v[0][0]
        if key[0] is not None and len(v)>=4 and span>=1800 and delta>=512*1024**2 and delta>=v[0][1]*0.3:
            candidates.append({'pid':key[1],'started':key[2],'executable':key[3],
                               'metric':key[4],'growth_bytes':delta,'samples':len(v),'span_seconds':round(span)})
    last = records[-1]; rates = []
    same_boot = [s for s in records if s['boot_timestamp'] is not None and s['boot_timestamp']==last['boot_timestamp']]
    for a,b in zip(same_boot,same_boot[1:]):
        x,y = a['vm_pages'].get('Swapouts'),b['vm_pages'].get('Swapouts'); span=b['timestamp']-a['timestamp']
        if x is not None and y is not None and y>=x and span>0 and b['page_size']:
            rates.append((y-x)*b['page_size']/span)
    return {'samples':len(records),'pressure_counts':dict(collections.Counter(s['pressure'] for s in records)),
            'pressure_episodes':[{'time':s['local_time'],'pressure':s['pressure'],'groups':dict(list(s['groups'].items())[:5])}
                                 for s in records if s['pressure'] in ('warning','critical')][:20],
            'max_swap_used_bytes':max((s['swap_used_bytes'] or 0 for s in records),default=0),
            'max_swapout_bytes_per_second':max(rates,default=0),
            'min_disk_available_bytes':min(s['disk']['available_bytes'] for s in records),
            'disk_available_change_bytes':last['disk']['available_bytes']-records[0]['disk']['available_bytes'],
            'growth_candidates':sorted(candidates,key=lambda x:x['growth_bytes'],reverse=True)[:15],
            'latest':last,'errors':ERRORS,'limits':'Samples can miss short spikes. RSS growth is not proof of a leak.'}

def storage_history(report, previous):
    """Retain bounded observations; the activity ledger remains the durable audit."""
    target = STATE/'storage-history.jsonl'
    records = []
    if target.exists():
        for line in target.read_text().splitlines():
            try: records.append(json.loads(line))
            except ValueError: WARNINGS.append({'file':target.name,'reason':'invalid_history_record'})
    known = {r['timestamp'] for r in records}
    if previous and previous['timestamp'] not in known: records.append(previous)
    records.append(report)
    records = sorted({r['timestamp']:r for r in records}.values(),key=lambda r:r['timestamp'])
    lines = [json.dumps(r,separators=(',',':'))+'\n' for r in records
             if r['timestamp']>=time.time()-90*86400]
    total = sum(len(line.encode()) for line in lines)
    while len(lines)>1 and total>8*1024**2: total-=len(lines.pop(0).encode())
    temporary = target.with_suffix('.tmp')
    temporary.write_text(''.join(lines)); temporary.replace(target)

def storage(run_id=None, phase='observation'):
    roots = ['Library/Caches','.npm','.cache','Library/Logs','Downloads','Library/Developer',
             '.codex/worktrees','.codex/archived_sessions','.codex/plugins',
             'Library/Application Support/Claude','Library/Application Support/minecraft',
             'Library/Application Support/Google/Chrome','Documents/Codex','code','Claude','projects','swbench-export','.cocoapods','.local','.vscode','actions-runner',
             '.codex-workspaces','Library/Developer/Xcode/DerivedData',
             'Library/Developer/CoreSimulator/Devices','Library/Caches/CocoaPods']
    result = []
    local_device = os.stat('/System/Volumes/Data').st_dev
    for rel in roots:
        p = Path.home()/rel
        entry = {'path':str(p),'allocated_bytes':None,'complete':False,
                 'method':'du-xsk-allocated-v1'}
        try:
            identity = p.stat()
            entry.update({'device':identity.st_dev,'resolved_path':str(p.resolve())})
        except FileNotFoundError:
            entry['state']='missing'; result.append(entry); continue
        except OSError as error:
            entry.update({'state':'inaccessible','reason':type(error).__name__})
            result.append(entry); continue
        if identity.st_dev!=local_device:
            entry['state']='external_volume_excluded'; result.append(entry); continue
        before = (len(ERRORS),len(WARNINGS)); raw=run(['/usr/bin/du','-xsk',entry['resolved_path']],timeout=20); m=re.match(r'(\d+)\s',raw)
        entry.update({'allocated_bytes':int(m.group(1))*1024 if m else None,
                      'complete':bool(m) and (len(ERRORS),len(WARNINGS))==before,
                      'state':'measured' if m else 'unmeasured'})
        result.append(entry)
    result.sort(key=lambda p:p['allocated_bytes'] or 0,reverse=True)
    target=STATE/'storage-latest.json'; old=json.loads(target.read_text()) if target.exists() else None
    report={'timestamp':time.time(),'disk':disk(),'directories':result,'errors':ERRORS,'coverage_warnings':WARNINGS,
            'phase':phase,'run_id':run_id,'directory_totals_are_not_additive':True}
    if old:
        report['previous_scan_timestamp']=old['timestamp']; sizes={p['path']:p for p in old['directories']}
        for p in result:
            prior=sizes.get(p['path'])
            comparable = (p['complete'] and prior and prior['complete'] and
                          p['method']==prior.get('method') and p['device']==prior.get('device') and
                          p['resolved_path']==prior.get('resolved_path') and
                          p['allocated_bytes'] is not None and prior['allocated_bytes'] is not None)
            if comparable:
                p['change_bytes']=p['allocated_bytes']-prior['allocated_bytes']
                p['previous_allocated_bytes']=prior['allocated_bytes']
            else: p['comparison']='baseline_missing_or_measurement_not_comparable'
    storage_history(report,old)
    if run_id:
        observations=[{k:p[k] for k in ('path','allocated_bytes','complete','state','change_bytes','previous_allocated_bytes','comparison') if k in p}
                      for p in result]
        event={'run_id':run_id,'skill':'mac-memory-maintenance','agent':'resource-helper',
               'event':'finding','status':'partial' if ERRORS or WARNINGS else 'ok',
               'operation':'storage_directory_observation','metrics_after':report['disk'],
               'evidence':{'scan_timestamp':report['timestamp'],'phase':phase,
                           'previous_scan_timestamp':report.get('previous_scan_timestamp'),
                           'directories':observations,'nested_totals_not_additive':True},
               'artifacts':[str(STATE/'storage-history.jsonl'),str(target)]}
        response = subprocess.run([sys.executable,str(Path(__file__).with_name('ledger.py'))],
                                  input=json.dumps(event),capture_output=True,text=True,timeout=15)
        report['ledger_recorded']=response.returncode==0
        if response.returncode: report['ledger_error']='ledger helper failed; retain scan and report failure'
    else:
        report['ledger_recorded']=False
        report['ledger_note']='Pass --run-id from the skill invocation to record this scan in the activity ledger.'
    target.write_text(json.dumps(report,indent=2)+'\n'); return report

def candidates(root,cutoff):
    if not root.exists() or any(p.is_symlink() for p in [root,*root.parents]): return
    for base,dirs,files in os.walk(root,followlinks=False):
        dirs[:]=[d for d in dirs if not (Path(base)/d).is_symlink()]
        for name in files:
            p=Path(base)/name
            try:
                s=p.lstat()
                if stat.S_ISREG(s.st_mode) and max(s.st_mtime,s.st_atime)<cutoff: yield p,s
            except OSError: continue

def package_operation(line):
    # Match the running program/subcommand, not mentions embedded in shell text.
    try: words=shlex.split(line)
    except ValueError: return False
    if not words: return False
    if Path(words[0]).name=='env':
        words=words[1:]
        while words and ('=' in words[0] or words[0].startswith('-')): words=words[1:]
    if not words: return False
    name=Path(words[0]).name
    if name in ('node','nodejs') and len(words)>1 and Path(words[1]).name in ('npm','npm-cli.js','brew'):
        words=words[1:]; name=Path(words[0]).name
    if name.startswith('python') and len(words)>2 and words[1:3]==['-m','pip']:
        words=words[2:]; name='pip'
    if name not in ('brew','pip','pip3','uv','npm','npm-cli.js'): return False
    ops={'install','uninstall','upgrade','sync','cache','cleanup','download','prune','ci','update'}
    return len(words)>1 and words[1] in ops

def clean(apply):
    # Inspect argv transiently to detect package operations; never store it.
    active=run(['/bin/ps','-axo','args='])
    busy=any(package_operation(line) for line in active.splitlines())
    if busy: return {'applied':False,'reason':'package-manager operation active','reclaimed_allocated_bytes':0}
    roots=[Path.home()/p for p in ['Library/Caches/Homebrew/downloads','Library/Caches/pip','.cache/pip','.npm/_logs']]
    total=0; count=0; errors=[]; by_root={}; before=disk()['available_bytes']
    for root in roots:
        amount=0
        for p,s in candidates(root,time.time()-30*86400):
            size=s.st_blocks*512
            if total+size>2*GIB: continue
            if apply:
                try:
                    now=p.lstat()
                    if (now.st_dev,now.st_ino,now.st_size,now.st_mtime_ns,now.st_atime_ns)!=(s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_atime_ns): continue
                    if any(parent.is_symlink() for parent in [p.parent,*p.parent.parents]): continue
                    p.unlink()
                except OSError as e:
                    errors.append({'root':str(root),'error':type(e).__name__}); continue
            total+=size; amount+=size; count+=1
        by_root[str(root)]=amount
    return {'applied':apply,'files':count,'eligible_allocated_bytes':total,'reclaimed_allocated_bytes':total if apply else 0,
            'by_root':by_root,'errors':errors[:20],'disk_available_before_bytes':before,'disk_available_after_bytes':disk()['available_bytes']}

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('mode',choices=['collect','analyze','storage','clean-caches'])
    p.add_argument('--tag',default='passive'); p.add_argument('--apply',action='store_true')
    p.add_argument('--run-id',help='Existing skill invocation UUID for storage ledger records')
    p.add_argument('--phase',choices=['observation','before_cleanup','after_cleanup'],default='observation')
    args=p.parse_args()
    if sys.platform!='darwin': p.error('macOS required')
    os.umask(0o077); STATE.mkdir(parents=True,exist_ok=True,mode=0o700)
    error_log=STATE/'sampler-errors.log'
    if error_log.exists() and error_log.stat().st_size>131072:
        with error_log.open('rb') as f:
            f.seek(-65536,2); tail=f.read()
        error_log.write_bytes(tail)
    with (STATE/'.lock').open('a') as lock:
        try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:
            print(json.dumps({'skipped':True,'reason':'maintenance already running'})); return
        if args.mode=='collect':
            s=snapshot(args.tag); result={'snapshot':s,'persistence':save(s)}
        elif args.mode=='analyze': result=analyze()
        elif args.mode=='storage': result=storage(args.run_id,args.phase)
        else: result=clean(args.apply)
        print(json.dumps(result,indent=2))

if __name__=='__main__': main()

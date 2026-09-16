#!/usr/bin/env python3
"""Local release journal. No network, credentials, or provider mutations."""
import argparse
import json
import os
from pathlib import Path
import re
import tempfile
from datetime import datetime, timezone

STATES = ('todo', 'in_progress', 'waiting_user', 'waiting_provider', 'failed', 'uncertain', 'done', 'not_applicable')
OWNERS = ('agent', 'user', 'provider')
BASES = ('observed', 'user_reported', 'inferred')


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def validate(data):
    if data.get('schema_version') != 1:
        raise ValueError('Unsupported ledger schema; expected 1')
    for key in ('app', 'repository', 'objective', 'created_at', 'updated_at'):
        if not isinstance(data.get(key), str) or not data[key].strip():
            raise ValueError(f'Missing {key}')
    if not data.get('platforms') or not set(data['platforms']) <= {'web', 'ios', 'android'}:
        raise ValueError('Invalid platforms')
    if not isinstance(data.get('steps'), dict) or not isinstance(data.get('events'), list):
        raise ValueError('steps must be an object and events an array')
    for gate, step in data['steps'].items():
        if not re.fullmatch(r'[a-z0-9]+(?:[._-][a-z0-9]+)*', gate):
            raise ValueError(f'Invalid gate ID: {gate}')
        if step.get('state') not in STATES or step.get('owner') not in OWNERS or step.get('basis') not in BASES:
            raise ValueError(f'Invalid state/owner/basis: {gate}')
        if not step.get('summary') or not step.get('updated_at'):
            raise ValueError(f'Missing summary/time: {gate}')
        evidence = step.get('evidence')
        if not isinstance(evidence, list) or any(not isinstance(e, str) or not e.strip() for e in evidence):
            raise ValueError(f'Evidence must be nonempty strings: {gate}')
        if step['state'] == 'done' and (step['basis'] != 'observed' or not evidence):
            raise ValueError(f'done requires observed evidence; user reports need readback: {gate}')
        if step['state'] not in ('done', 'not_applicable') and not step.get('next_action'):
            raise ValueError(f'Unfinished gate requires next_action: {gate}')
    if [event.get('sequence') for event in data['events']] != list(range(1, len(data['events']) + 1)):
        raise ValueError('Event sequence must be contiguous and append-only')
    for event in data['events']:
        if event.get('gate') not in data['steps'] or not event.get('at') or not isinstance(event.get('result'), dict):
            raise ValueError('Invalid event')
    for gate, step in data['steps'].items():
        history = [e for e in data['events'] if e['gate'] == gate]
        if not history or history[-1]['result'] != step:
            raise ValueError(f'Latest event does not match current step: {gate}')
    return data


def atomic_write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix='.' + path.name, dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as out:
            out.write(value)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def markdown(data):
    def cell(value):
        return str(value).replace('|', '\\|').replace('\n', ' ')
    lines = [f"# {data['app']} release ledger", '', f"Updated: {data['updated_at']}", '',
             f"Repository: {data['repository']}", '', f"Objective: {data['objective']}", '',
             'Generated from the adjacent JSON ledger. Update through ledger.py, not this view.', '',
             '| Gate | State | Owner | Evidence basis | Result | Next action |', '|---|---|---|---|---|---|']
    for gate, step in data['steps'].items():
        lines.append('| ' + ' | '.join(cell(x) for x in (gate, step['state'], step['owner'], step['basis'], step['summary'], step['next_action'] or '—')) + ' |')
    lines += ['', '## Evidence and history', '']
    for event in data['events']:
        step = event['result']
        lines += [f"### {event['sequence']}. {event['gate']} — {step['state']}", '',
                  f"{event['at']} · {step['basis']} · {step['owner']}", '', step['summary'], '']
        lines += [f'- {e}' for e in step['evidence']]
        if step['next_action']:
            lines += ['', 'Next: ' + step['next_action']]
        lines.append('')
    return '\n'.join(lines).rstrip() + '\n'


def save(path, data):
    validate(data)
    atomic_write(path, json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    atomic_write(Path(path).with_suffix('.md'), markdown(data))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    init = commands.add_parser('init')
    init.add_argument('path', type=Path)
    init.add_argument('--app', required=True)
    init.add_argument('--repo', required=True)
    init.add_argument('--objective', required=True)
    init.add_argument('--platforms', nargs='+', choices=['web', 'ios', 'android'], required=True)
    record = commands.add_parser('record')
    record.add_argument('path', type=Path)
    record.add_argument('gate')
    record.add_argument('--state', choices=STATES, required=True)
    record.add_argument('--owner', choices=OWNERS, required=True)
    record.add_argument('--basis', choices=BASES, required=True)
    record.add_argument('--summary', required=True)
    record.add_argument('--evidence', action='append', default=[])
    record.add_argument('--next', dest='next_action', default='')
    for command in ('status', 'validate', 'render'):
        sub = commands.add_parser(command)
        sub.add_argument('path', type=Path)
    args = parser.parse_args()
    try:
        if args.path.suffix != '.json':
            raise ValueError('Ledger path must end in .json')
        if args.command == 'init':
            if args.path.exists() or args.path.with_suffix('.md').exists():
                raise ValueError('Ledger already exists; resume it instead of overwriting')
            stamp = now()
            data = dict(schema_version=1, app=args.app, repository=args.repo, objective=args.objective,
                        platforms=list(dict.fromkeys(args.platforms)), created_at=stamp, updated_at=stamp,
                        steps={}, events=[], metrics={'tokens': None, 'cost_usd': None})
            save(args.path, data)
        else:
            data = validate(json.loads(args.path.read_text(encoding='utf-8')))
            if args.command == 'record':
                step = {key:getattr(args,key) for key in ('state', 'owner', 'basis', 'summary', 'evidence', 'next_action')}
                old = data['steps'].get(args.gate, {})
                if step == {key:old.get(key) for key in step}:
                    print('Unchanged; no duplicate event recorded.')
                    return
                stamp = now()
                step['updated_at'] = stamp
                data['steps'][args.gate] = step
                data['events'].append(dict(sequence=len(data['events'])+1, at=stamp, gate=args.gate, result=step))
                data['updated_at'] = stamp
                save(args.path, data)
            elif args.command == 'render':
                atomic_write(args.path.with_suffix('.md'), markdown(data))
            elif args.command == 'status':
                for gate, step in data['steps'].items():
                    print(f"{gate}: {step['state']} ({step['owner']}, {step['basis']}) — {step['next_action'] or step['summary']}")
            else:
                print('Ledger valid.')
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(1, f'ledger: {error}\n')


if __name__ == '__main__':
    main()

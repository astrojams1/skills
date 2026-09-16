#!/usr/bin/env python3
"""Behavioral checks for durable release-ledger invariants."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT=Path(__file__).resolve().parents[1]/'skills/app-release/scripts/ledger.py'
class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path=Path(self.temp.name)/'store/ledger.json'
        self.run_cli('init',str(self.path),'--app','Fixture','--repo','https://example.test/repo','--platforms','ios','--objective','Submit for review')
    def run_cli(self,*args,success=True):
        r=subprocess.run([sys.executable,str(SCRIPT),*args],capture_output=True,text=True)
        self.assertEqual(r.returncode==0,success,r.stderr)
        return r
    def record(self,state,basis='observed',evidence=True,next_action='Read back provider state',success=True):
        args=['record',str(self.path),'apple.tax','--state',state,'--owner','agent','--basis',basis,'--summary','Fixture tax observation']
        if evidence: args+=['--evidence','Fixture provider receipt']
        if next_action: args+=['--next',next_action]
        return self.run_cli(*args,success=success)
    def test_existing_run_is_never_overwritten(self):
        before=self.path.read_bytes()
        self.run_cli('init',str(self.path),'--app','Other','--repo','https://example.test/other','--platforms','android','--objective','Other',success=False)
        self.assertEqual(before,self.path.read_bytes())
    def test_claims_require_observation_and_evidence(self):
        before=self.path.read_bytes()
        self.record('done',basis='user_reported',success=False)
        self.record('done',evidence=False,success=False)
        self.record('waiting_provider',next_action='',success=False)
        self.assertEqual(before,self.path.read_bytes())
    def test_resume_retains_history_and_duplicate_retry_is_noop(self):
        self.record('in_progress',basis='user_reported')
        before=self.path.read_bytes()
        self.record('in_progress',basis='user_reported')
        self.assertEqual(before,self.path.read_bytes())
        self.record('done',next_action='')
        data=json.loads(self.path.read_text())
        self.assertEqual(len(data['events']),2)
        self.assertEqual(data['events'][0]['result']['basis'],'user_reported')
        self.assertEqual(data['steps']['apple.tax']['state'],'done')
        self.assertIsNone(data['metrics']['tokens'])
        self.run_cli('validate',str(self.path))
        self.assertIn('apple.tax: done',self.run_cli('status',str(self.path)).stdout)
    def test_corrupt_projection_is_rejected_and_markdown_can_be_rebuilt(self):
        self.record('in_progress')
        self.path.with_suffix('.md').unlink()
        self.run_cli('render',str(self.path))
        self.assertTrue(self.path.with_suffix('.md').exists())
        data=json.loads(self.path.read_text()); data['steps']['apple.tax']['summary']='Unjournaled change'
        self.path.write_text(json.dumps(data))
        self.run_cli('validate',str(self.path),success=False)
if __name__=='__main__': unittest.main()

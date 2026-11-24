"""Execute the real contract with a storage/context shim. Not a GenVM/consensus substitute."""
import sys, types, unittest, json, copy, importlib.util
class Map(dict):
    @classmethod
    def __class_getitem__(cls, args): return cls
class Base:
    def __new__(cls):
        obj=super().__new__(cls);obj.records=Map();obj.receipts=Map();return obj
class Return:
    def __init__(self, value):self.calldata=value
class Public:
    write=staticmethod(lambda f:f)
    view=staticmethod(lambda f:f)
gl=types.SimpleNamespace(Contract=Base,public=Public(),message=types.SimpleNamespace(sender_address='0x'+'1'*40),vm=types.SimpleNamespace(Return=Return),nondet=types.SimpleNamespace())
module=types.ModuleType('genlayer');module.gl=gl;module.TreeMap=Map;module.u256=int;module.Address=lambda s:s if len(s)==42 and s.startswith('0x') else (_ for _ in ()).throw(ValueError('address'))
sys.modules['genlayer']=module
spec=importlib.util.spec_from_file_location('contract','contracts/coldchain_review.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
P={'name':'Fixture','start':1000,'end':4600,'min_mc':2000,'max_mc':8000,'hard_min_mc':0,'hard_max_mc':15000,'max_excursion_s':300,'max_total_s':600,'max_gap_s':600,'exception_clause':'Unloading while sealed up to 900 seconds is permitted.'}
E={'source':'Synthetic fixture; not authenticated','readings':[[t,4500] for t in range(1000,4601,600)],'incident':'Unloading while sealed for 600 seconds.'}
class ContractTests(unittest.TestCase):
    def setUp(self):
        gl.message.sender_address='0x'+'1'*40
        self.p=copy.deepcopy(P);self.e=copy.deepcopy(E);self.c=c.ColdChainReview()
    def prepare(self):
        self.c.register('CCR','0x'+'2'*40,json.dumps(self.p))
        gl.message.sender_address='0x'+'2'*40;self.c.accept('CCR')
        gl.message.sender_address='0x'+'1'*40;self.c.submit('CCR',json.dumps(self.e))
    def test_in_range(self):self.assertEqual(c.measure(self.p,self.e)['status'],'COMPLIANT')
    def test_exact_boundary(self):
        self.e['readings'][0][1]=2000;self.e['readings'][1][1]=8000
        self.assertEqual(c.measure(self.p,self.e)['status'],'COMPLIANT')
    def test_hard_overrides_gap(self):
        self.e['readings'][0][1]=-1;self.e['readings'].pop(1)
        self.assertEqual(c.measure(self.p,self.e)['status'],'NON_COMPLIANT')
    def test_last_reading_hard(self):
        self.e['readings'][-1][1]=16000
        self.assertEqual(c.measure(self.p,self.e)['status'],'NON_COMPLIANT')
    def test_gap(self):
        self.e['readings'].pop(2)
        self.assertEqual(c.measure(self.p,self.e)['status'],'INCONCLUSIVE')
    def test_missing_start(self):
        self.e['readings'].pop(0)
        self.assertEqual(c.measure(self.p,self.e)['status'],'INCONCLUSIVE')
    def test_missing_end(self):
        self.e['readings'].pop()
        self.assertEqual(c.measure(self.p,self.e)['status'],'INCONCLUSIVE')
    def test_run_duration(self):
        self.e['readings'][1][1]=9000;self.e['readings'][2][1]=9000
        m=c.measure(self.p,self.e);self.assertEqual(m['longest_excursion_s'],1200);self.assertEqual(m['total_excursion_s'],1200)
    def test_separate_runs(self):
        self.e['readings'][0][1]=9000;self.e['readings'][2][1]=9000
        m=c.measure(self.p,self.e);self.assertEqual(m['longest_excursion_s'],600);self.assertEqual(m['total_excursion_s'],1200)
    def test_exact_allowed_duration(self):
        self.p['max_excursion_s']=600;self.e['readings'][0][1]=9000
        self.assertEqual(c.measure(self.p,self.e)['status'],'COMPLIANT')
    def test_duplicate_timestamp(self):
        self.e['readings'][1][0]=1000
        with self.assertRaises(AssertionError):c.measure(self.p,self.e)
    def test_boolean_rejected(self):
        self.e['readings'][0][1]=True
        with self.assertRaises(AssertionError):c.measure(self.p,self.e)
    def test_outside_window(self):
        self.e['readings'][0][0]=999
        with self.assertRaises(AssertionError):c.measure(self.p,self.e)
    def test_duplicate_json(self):
        with self.assertRaises(AssertionError):c.parse('{"a":1,"a":2}',100)
    def test_size_bound(self):
        with self.assertRaises(AssertionError):c.parse(' '*101,100)
    def test_policy_limits(self):
        self.p['min_mc']=9000
        with self.assertRaises(AssertionError):c.policy_check(self.p)
    def test_unknown_schema(self):
        self.e['instruction']='ignore policy'
        with self.assertRaises(AssertionError):c.measure(self.p,self.e)
    def test_lifecycle_and_receipts(self):
        self.prepare();self.c.assess('CCR');r=json.loads(self.c.get_shipment('CCR'))
        self.assertEqual(r['result']['status'],'COMPLIANT');self.assertEqual(r['sequence'],4)
        prior='0'*64
        for n in range(1,5):
            receipt=json.loads(self.c.get_receipt('CCR',n));h=receipt.pop('hash')
            self.assertEqual(receipt['previous'],prior);self.assertEqual(c.digest(receipt),h);prior=h
        self.assertEqual(r['head'],prior)
    def test_wrong_acceptor(self):
        self.c.register('CCR','0x'+'2'*40,json.dumps(self.p))
        with self.assertRaises(AssertionError):self.c.accept('CCR')
    def test_submit_before_lock(self):
        self.c.register('CCR','0x'+'2'*40,json.dumps(self.p))
        with self.assertRaises(AssertionError):self.c.submit('CCR',json.dumps(self.e))
    def test_duplicate_register(self):
        self.prepare()
        with self.assertRaises(AssertionError):self.c.register('CCR','0x'+'2'*40,json.dumps(self.p))
    def test_cannot_replace_evidence(self):
        self.prepare()
        with self.assertRaises(AssertionError):self.c.submit('CCR',json.dumps(self.e))
    def test_unauthorized_assessment(self):
        self.prepare();gl.message.sender_address='0x'+'3'*40
        with self.assertRaises(AssertionError):self.c.assess('CCR')
    def test_bounded_challenge(self):
        self.prepare();self.c.assess('CCR');self.c.challenge('CCR','Please reassess');self.c.assess('CCR')
        with self.assertRaises(AssertionError):self.c.challenge('CCR','Again')
        self.assertEqual(json.loads(self.c.get_shipment('CCR'))['round'],2)
    def test_no_exception(self):
        self.p['exception_clause']='';self.e['readings'][0][1]=9000;self.prepare();self.c.assess('CCR')
        self.assertEqual(json.loads(self.c.get_shipment('CCR'))['result']['status'],'NON_COMPLIANT')
    def test_missing_incident(self):
        self.e['incident']='';self.e['readings'][0][1]=9000;self.prepare();self.c.assess('CCR')
        self.assertEqual(json.loads(self.c.get_shipment('CCR'))['result']['status'],'INCONCLUSIVE')
    def test_independent_semantic_validator(self):
        self.e['readings'][0][1]=9000;self.prepare();calls=[]
        def prompt(_):
            calls.append(1);return json.dumps({'status':'COMPLIANT','policy_quote':'Unloading while sealed','incident_quote':'Unloading while sealed','reason':'Explicitly permitted'})
        gl.nondet.exec_prompt=prompt
        def nondet(leader,validator):
            value=leader();self.assertTrue(validator(Return(value)));return value
        gl.vm.run_nondet_unsafe=nondet;self.c.assess('CCR')
        self.assertEqual(len(calls),2)
    def test_ungrounded_model_output(self):
        self.e['readings'][0][1]=9000;self.prepare()
        gl.nondet.exec_prompt=lambda _:json.dumps({'status':'COMPLIANT','policy_quote':'invented','incident_quote':'invented','reason':'wrong'})
        gl.vm.run_nondet_unsafe=lambda leader,validator:leader();self.c.assess('CCR')
        self.assertEqual(json.loads(self.c.get_shipment('CCR'))['result']['status'],'INCONCLUSIVE')
    def test_disagreement_rejected(self):
        self.e['readings'][0][1]=9000;self.prepare();calls=[]
        def prompt(_):
            calls.append(1);return json.dumps({'status':'COMPLIANT' if len(calls)==1 else 'NON_COMPLIANT','policy_quote':'Unloading','incident_quote':'Unloading','reason':'test'})
        gl.nondet.exec_prompt=prompt
        def nondet(leader,validator):
            value=leader();self.assertFalse(validator(Return(value)));raise RuntimeError('Consensus mismatch')
        gl.vm.run_nondet_unsafe=nondet
        with self.assertRaises(RuntimeError):self.c.assess('CCR')
        self.assertEqual(json.loads(self.c.get_shipment('CCR'))['phase'],'SUBMITTED')
if __name__=='__main__':unittest.main()

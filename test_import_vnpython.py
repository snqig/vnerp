import importlib, traceback
try:
    vnpython = importlib.import_module('vnpython')
    print('Import OK')
except Exception as e:
    traceback.print_exc()

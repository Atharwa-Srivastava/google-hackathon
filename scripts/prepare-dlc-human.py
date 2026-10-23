"""Reproduce pinned, local-only face/palm exclusion models (not waste labels)."""
import hashlib, json, pathlib, tempfile, urllib.request
import onnx
ROOT = pathlib.Path(__file__).resolve().parent.parent
metadata = json.loads((ROOT / 'data/dlc-human-guard.json').read_text())
for model in metadata['models']:
    url = f"https://media.githubusercontent.com/media/opencv/opencv_zoo/{metadata['revision']}/models/{model['source']}"
    raw = urllib.request.urlopen(url, timeout=90).read()
    assert hashlib.sha256(raw).hexdigest() == model.get('originalSha256', model['sha256']), 'Upstream checksum mismatch'
    if model['file'] == 'dlc-face.onnx':
        net = onnx.load_model_from_string(raw)
        for dimension in net.graph.input[0].type.tensor_type.shape.dim[2:]:
            dimension.dim_value = 320
        for output in net.graph.output:
            output.type.tensor_type.shape.dim[1].dim_value //= 4
        del net.graph.value_info[:]
        net = onnx.shape_inference.infer_shapes(net)
        onnx.checker.check_model(net)
        raw = net.SerializeToString()
    assert len(raw) == model['bytes'] and hashlib.sha256(raw).hexdigest() == model['sha256'], 'Derived checksum mismatch; use onnx 1.17.0'
    (ROOT / 'dist' / model['file']).write_bytes(raw)
(ROOT / 'dist/dlc-human-guard.json').write_text(json.dumps(metadata, separators=(',', ':')))
print('Verified pinned face and palm exclusion weights.')

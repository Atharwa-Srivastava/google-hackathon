"""Extract the pinned Apache-2.0 ONNX MobileNet pooled feature backbone.

Requires onnx==1.17.0. Downloads a model, never the user's images.
"""
import argparse, hashlib, tempfile, urllib.request
from pathlib import Path
import onnx

parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);args=parser.parse_args()
revision='4c46cd00fbdb7cd30b6c1c17ab54f2e1f4f7b177'
url=f'https://media.githubusercontent.com/media/onnx/models/{revision}/validated/vision/classification/mobilenet/model/mobilenetv2-12-qdq.onnx'
raw=urllib.request.urlopen(url,timeout=90).read()
assert hashlib.sha256(raw).hexdigest()=='41a36090dafe98f4ad8f9b7fe0b218c56ac3c031e547f0367c30655d2702bffe','Upstream checksum changed'
with tempfile.TemporaryDirectory() as folder:
 source=Path(folder)/'source.onnx';source.write_bytes(raw)
 model=onnx.load(source)
 # Shape inference supplies the intermediate output metadata for extraction.
 model=onnx.shape_inference.infer_shapes(model)
 output_info=onnx.helper.make_tensor_value_info('472_Gemm_104_MatMul_dequantized',onnx.TensorProto.FLOAT,['batch_size',1280])
 existing=next((item for item in model.graph.value_info if item.name==output_info.name),None)
 if existing is not None:existing.CopyFrom(output_info)
 else:model.graph.value_info.append(output_info)
 onnx.save(model,source)
 output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True)
 onnx.utils.extract_model(str(source),str(output),[model.graph.input[0].name],['472_Gemm_104_MatMul_dequantized'])
 model=onnx.load(output)
 model.graph.output[0].CopyFrom(onnx.helper.make_tensor_value_info('472_Gemm_104_MatMul_dequantized',onnx.TensorProto.FLOAT,['batch_size',1280]))
 onnx.checker.check_model(model);onnx.save(model,output)
 print(f'Extracted {output} ({output.stat().st_size} bytes). Retrain the head to bind its checksum.')

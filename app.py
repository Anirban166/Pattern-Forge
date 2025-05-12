from flask import Flask, send_file, render_template, jsonify
from pattern import ShirtPattern

app = Flask(__name__, template_folder="templates")

@app.route("/")
def home():
    return "<p><a href='/3d'>View 3D Pattern</a> | <a href='/download-dxf'>Download DXF</a></p>"

@app.route("/pattern-data")
def pattern_data():
    pattern = ShirtPattern(100, 90, 70, 40)
    return jsonify(pattern.segments)

@app.route("/3d")
def pattern_3d():
    return render_template("3d.html")

@app.route("/download-dxf")
def download_dxf():
    pattern = ShirtPattern(100, 90, 70, 40)
    dxf_path = pattern.export_dxf("static/pattern.dxf")
    return send_file(dxf_path, as_attachment=True)

if __name__ == "__main__":
    app.run()

from flask import Flask, send_file, render_template, jsonify, request
from pattern import ShirtPattern, create_dxf_from_segments
import os

app = Flask(__name__, template_folder="templates")

@app.route("/")
def pattern_3d():
    return render_template("3d.html")

@app.route("/pattern-data")
def pattern_data():
    # This route might be obsolete if patternPresets are solely client-side for dynamic generation
    # Or it could serve the raw data for one specific default pattern if needed elsewhere.
    pattern = ShirtPattern(100, 90, 70, 40)
    return jsonify(pattern.segments)

@app.route("/download-dxf")
def download_dxf():
    pattern = ShirtPattern(100, 90, 70, 40)
    static_dir = os.path.join(app.static_folder)
    os.makedirs(static_dir, exist_ok=True)
    dxf_path = pattern.export_dxf(os.path.join(static_dir, "pattern_default.dxf"))
    return send_file(dxf_path, as_attachment=True, download_name="pattern_default.dxf")

# New endpoint for dynamic DXF export:
@app.route("/api/export-dxf", methods=['POST'])
def api_export_dxf():
    data = request.json
    segments_for_dxf = data.get('segments')

    if not segments_for_dxf:
        return jsonify({"error": "No segment data provided"}), 400
    try:
        static_dir = os.path.join(app.static_folder)
        os.makedirs(static_dir, exist_ok=True)
        # Creating a unique-ish filename to avoid conflicts if multiple users export: (though send_file's download_name handles what the user sees)
        temp_dxf_filename = f"pattern_export_{os.urandom(4).hex()}.dxf"
        dxf_output_path = os.path.join(static_dir, temp_dxf_filename)

        actual_dxf_path = create_dxf_from_segments(segments_for_dxf, dxf_output_path)

        return send_file(actual_dxf_path,
                         as_attachment=True,
                         download_name="custom_pattern.dxf",
                         mimetype='application/dxf')
    except Exception as e:
        print(f"Error during DXF export: {e}")
        return jsonify({"error": "Failed to generate DXF file", "details": str(e)}), 500

if __name__ == "__main__":
    app.run()
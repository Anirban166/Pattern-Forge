import ezdxf, os
import numpy as np
from collections import defaultdict
from typing import List, Tuple, Dict, Any

class ShirtPattern:
    def __init__(self, height: float, width: float, sleeve_length: float, collar_width: float):
        self.height = height
        self.width = width
        self.sleeve_length = sleeve_length
        self.collar_width = collar_width

    def generate_segments(self) -> List[Tuple[str, List[Tuple[float, float]]]]:
        p0 = (0, 0)
        p1 = (self.width, 0)
        p2 = (self.width, self.height * 0.4)
        p3 = (self.width * 0.5, self.height)
        p4 = (0, self.height)
        p5 = (0, 0)

        bezier_collar = (
            "bezier",
            [
                p0,
                (self.width * 0.2, -self.collar_width),
                (self.width * 0.8, -self.collar_width),
                p1
            ]
        )
        bezier_sleeve = (
            "bezier",
            [
                p2,
                (self.width, self.height * 0.6),
                (self.width * 0.7, self.height * 0.8),
                p3
            ]
        )
        sleeve_start = p2
        sleeve_end = (self.width + self.sleeve_length, self.height * 0.6)
        bezier_sleeve_right = (
            "bezier",
            [
                sleeve_start,
                (self.width + self.sleeve_length * 0.2, self.height * 0.5),
                (self.width + self.sleeve_length * 0.3, self.height * 0.7),
                sleeve_end
            ]
        )

        return [
            ("line", [p1, p2]),
            bezier_sleeve,
            ("line", [p3, p4]),
            ("line", [p4, p5]),
            bezier_collar,
            bezier_sleeve_right,
        ]

    @property
    def segments(self) -> List[Tuple[str, List[Tuple[float, float]]]]:
        return self.generate_segments()

    def export_dxf(self, filename: str) -> str:
        doc = ezdxf.new()
        msp = doc.modelspace()

        for segment_type, segment_points in self.generate_segments():
            if segment_type == "line":
                p1, p2 = segment_points
                msp.add_line(p1, p2)
            elif segment_type == "bezier":
                p0, c1, c2, p3 = segment_points
                def bezier_calc(t): return (
                    (1 - t)**3 * np.array(p0) +
                    3 * (1 - t)**2 * t * np.array(c1) +
                    3 * (1 - t) * t**2 * np.array(c2) +
                    t**3 * np.array(p3)
                )
                points = [bezier_calc(t) for t in np.linspace(0, 1, 20)]
                for a, b in zip(points[:-1], points[1:]):
                    msp.add_line(tuple(a), tuple(b))

        outpath = os.path.abspath(filename)
        doc.saveas(outpath)
        return outpath

def create_dxf_from_segments(segments_data: List[Dict[str, Any]], filename: str) -> str:
    doc = ezdxf.new()
    msp = doc.modelspace()

    for segment in segments_data:
        segment_type = segment.get("type")
        points_data = segment.get("points")

        if not points_data:
            continue

        if segment_type == "line":
            if len(points_data) == 2:
                p1 = tuple(points_data[0])
                p2 = tuple(points_data[1])
                msp.add_line(p1, p2)
        elif segment_type == "bezier":
            if len(points_data) == 4:
                p0 = tuple(points_data[0])
                c1 = tuple(points_data[1])
                c2 = tuple(points_data[2])
                p3 = tuple(points_data[3])
                
                # Approximate cubic Bezier with 20-point polyline
                def bezier_formula(t): return (
                    (1 - t)**3 * np.array(p0) +
                    3 * (1 - t)**2 * t * np.array(c1) +
                    3 * (1 - t) * t**2 * np.array(c2) +
                    t**3 * np.array(p3)
                )
                poly_points = [bezier_formula(t) for t in np.linspace(0, 1, 20)]
                for i in range(len(poly_points) - 1):
                    msp.add_line(tuple(poly_points[i]), tuple(poly_points[i+1]))
    
    outpath = os.path.abspath(filename)
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    doc.saveas(outpath)
    return outpath

def merge_layer(entityList, targetLayer):
    targetLayerLinesList = []
    for entity in entityList:
        if entity.get("layer") == targetLayer and entity.get("type") == "LINE":
            targetLayerLinesList.append(entity)

    verticesDict = defaultdict(list)
    for line in targetLayerLinesList:
        x = tuple(line["vertices"][0].values())
        y = tuple(line["vertices"][1].values())
        verticesDict[x].append(y)
        verticesDict[y].append(x)

    startingVertex = None
    for vertex, connections in verticesDict.items():
        if len(connections) == 1:
            startingVertex = vertex
            break
    if startingVertex is None:
        startingVertex = tuple(targetLayerLinesList[0]["vertices"][0].values())

    currentVertex = startingVertex
    visited = set()
    mergedVertices = []
    mergedVertices.append({"x": currentVertex[0], "y": currentVertex[1]})

    while True:
        foundUnvisitedEdge = False
        for nextVertex in verticesDict[currentVertex]:
            edge = tuple(sorted((currentVertex, nextVertex)))
            if edge not in visited:
                mergedVertices.append({"x": nextVertex[0], "y": nextVertex[1]})
                visited.add(edge)
                currentVertex = nextVertex
                foundUnvisitedEdge = True
                break
        if not foundUnvisitedEdge:
            break

    polyLineEntity = {
        "type": "POLYLINE",
        "vertices": mergedVertices,
        "layer": targetLayer
    }
    return polyLineEntity
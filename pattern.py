from typing import List, Tuple, Union
import ezdxf
import os
import numpy as np

Segment = Union[
    Tuple[str, List[Tuple[float, float]]],  # 'line' or 'bezier'
]

class ShirtPattern:
    def __init__(self, height: float, width: float, sleeve_length: float, collar_width: float):
        self.height = height
        self.width = width
        self.sleeve_length = sleeve_length
        self.collar_width = collar_width

    def generate_segments(self) -> List[Segment]:
        p0 = (0, 0)
        p1 = (self.width, 0)
        p2 = (self.width, self.height * 0.4)
        p3 = (self.width * 0.5, self.height)
        p4 = (0, self.height)
        p5 = (0, 0)

        # Collar curve: top front
        bezier_collar = (
            "bezier",
            [
                p0,
                (self.width * 0.2, -self.collar_width),
                (self.width * 0.8, -self.collar_width),
                p1
            ]
        )

        # Sleeve curve: side shoulder to underarm
        bezier_sleeve = (
            "bezier",
            [
                p2,
                (self.width, self.height * 0.6),
                (self.width * 0.7, self.height * 0.8),
                p3
            ]
        )

        # Right sleeve (optional shape shown outward)
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
    def segments(self) -> List[Segment]:
        return self.generate_segments()

    def export_dxf(self, filename: str) -> str:
        doc = ezdxf.new()
        msp = doc.modelspace()

        for segment in self.generate_segments():
            if segment[0] == "line":
                p1, p2 = segment[1]
                msp.add_line(p1, p2)
            elif segment[0] == "bezier":
                p0, c1, c2, p3 = segment[1]
                # Approximate cubic Bezier with 20-point polyline
                def bezier(t): return (
                    (1 - t)**3 * np.array(p0) +
                    3 * (1 - t)**2 * t * np.array(c1) +
                    3 * (1 - t) * t**2 * np.array(c2) +
                    t**3 * np.array(p3)
                )
                points = [bezier(t) for t in np.linspace(0, 1, 20)]
                for a, b in zip(points[:-1], points[1:]):
                    msp.add_line(tuple(a), tuple(b))

        outpath = os.path.abspath(filename)
        doc.saveas(outpath)
        return outpath
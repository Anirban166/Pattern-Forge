from typing import List, Tuple, Union
import ezdxf
import os

Segment = Union[
    Tuple[str, List[Tuple[float, float]]],  # line
    Tuple[str, List[Tuple[float, float]]],  # bezier (still a list of 4 points)
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

        # Example Bezier sleeve curve from p2 → p3
        bezier_sleeve = (
            "bezier",
            [p2,
             (self.width, self.height * 0.6),
             (self.width * 0.7, self.height * 0.8),
             p3]
        )

        # Example Bezier collar curve from p0 → p1
        bezier_collar = (
            "bezier",
            [p0,
             (self.width * 0.2, -self.collar_width),
             (self.width * 0.8, -self.collar_width),
             p1]
        )

        # Right sleeve (separate shape for 3D view)
        sleeve_start = (self.width, self.height * 0.4)
        sleeve_end = (self.width * 1.5, self.height * 0.6)
        bezier_sleeve_right = (
            "bezier",
            [sleeve_start,
             (self.width * 1.2, self.height * 0.5),
             (self.width * 1.3, self.height * 0.7),
             sleeve_end]
        )

        return [
            ("line", [p1, p2]),
            bezier_sleeve,
            ("line", [p3, p4]),
            ("line", [p4, p5]),
            bezier_collar,
            # Adding sleeve
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
                # Approximate Bezier with polyline (for simplicity)
                import numpy as np
                def bezier(t): return (
                    (1 - t) ** 3 * np.array(p0) +
                    3 * (1 - t) ** 2 * t * np.array(c1) +
                    3 * (1 - t) * t ** 2 * np.array(c2) +
                    t ** 3 * np.array(p3)
                )
                points = [bezier(t) for t in np.linspace(0, 1, 20)]
                for a, b in zip(points[:-1], points[1:]):
                    msp.add_line(tuple(a), tuple(b))

        outpath = os.path.abspath(filename)
        doc.saveas(outpath)
        return outpath

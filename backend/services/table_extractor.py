"""
Table Extractor Module
Handles coordinate clustering and table cell reconstruction for complex timetable PDFs.
"""

from typing import List, Dict, Any, Tuple
import numpy as np

class TableExtractor:
    @staticmethod
    def cluster_blocks_to_grid(blocks: List[Dict[str, Any]], y_tolerance: float = 8.0, x_tolerance: float = 12.0) -> List[List[str]]:
        """
        Takes raw text bounding boxes and clusters them into a 2D matrix of rows and columns.
        """
        if not blocks:
            return []

        # Sort blocks top-to-bottom, then left-to-right
        sorted_blocks = sorted(blocks, key=lambda b: (b["y0"], b["x0"]))

        # Group into rows based on y0 proximity
        rows: List[List[Dict[str, Any]]] = []
        for b in sorted_blocks:
            placed = False
            for row in rows:
                # Compare average y0 of row
                avg_y = sum(item["y0"] for item in row) / len(row)
                if abs(b["y0"] - avg_y) <= y_tolerance:
                    row.append(b)
                    placed = True
                    break
            if not placed:
                rows.append([b])

        # Sort each row by x0
        for row in rows:
            row.sort(key=lambda item: item["x0"])

        # Determine global column boundaries using x0 coordinates
        all_x0 = [b["x0"] for row in rows for b in row]
        if not all_x0:
            return []

        # Find column clusters
        col_centers: List[float] = []
        for x in sorted(all_x0):
            if not col_centers:
                col_centers.append(x)
            else:
                if abs(x - col_centers[-1]) > x_tolerance:
                    col_centers.append(x)

        # Build 2D text matrix
        matrix: List[List[str]] = []
        for row in rows:
            row_cells = [""] * len(col_centers)
            for b in row:
                # Find closest column center
                best_col_idx = int(np.argmin([abs(b["x0"] - c) for c in col_centers]))
                if row_cells[best_col_idx]:
                    row_cells[best_col_idx] += "\n" + b["text"]
                else:
                    row_cells[best_col_idx] = b["text"]
            # Only keep rows with at least one non-empty cell
            if any(cell.strip() for cell in row_cells):
                matrix.append(row_cells)

        return matrix

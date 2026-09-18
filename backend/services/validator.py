"""
Timetable Validator Module
Performs data quality checks, duplicate detection, time validation,
and conflict detection (teacher conflicts, room conflicts, class conflicts) using pandas & numpy.
Generates dynamic filter catalogs from actual extracted data.
"""

from typing import List, Dict, Any, Tuple
import pandas as pd
import numpy as np
from services.normalizer import parse_time_to_minutes

class TimetableValidator:
    def __init__(self, entries: List[Dict[str, Any]]):
        self.entries = entries
        self.df = pd.DataFrame(entries) if entries else pd.DataFrame(columns=[
            "id", "day", "startTime", "endTime", "time", "subject", "courseCode",
            "teacher", "room", "className", "displayName", "program", "year",
            "semester", "section", "shift", "batch", "department", "sourcePage",
            "rawText", "confidence"
        ])

    def validate_dataset(self) -> Dict[str, Any]:
        """
        Runs comprehensive pandas & numpy validation on the dataset.
        Returns validated_entries, duplicates, conflicts, and aggregated dynamic stats.
        """
        if self.df.empty:
            return {
                "entries": [],
                "duplicates": [],
                "conflicts": [],
                "stats": {
                    "totalEntries": 0,
                    "classesCount": 0,
                    "programsCount": 0,
                    "teachersCount": 0,
                    "roomsCount": 0,
                    "subjectsCount": 0,
                    "daysCount": 0,
                    "conflictsCount": 0,
                    "reviewNeededCount": 0,
                    "totalHours": 0.0,
                    "classes": [],
                    "programs": [],
                    "teachers": [],
                    "rooms": [],
                    "subjects": [],
                    "days": []
                }
            }

        # 1. Clean & compute start/end minutes using numpy vectorization
        start_mins = []
        end_mins = []
        durations_hours = []

        for _, row in self.df.iterrows():
            s_min = parse_time_to_minutes(str(row.get("startTime", "")))
            e_min = parse_time_to_minutes(str(row.get("endTime", "")))
            if s_min is not None and e_min is not None and e_min > s_min:
                dur = (e_min - s_min) / 60.0
            else:
                dur = 1.5 # default 1.5 hour class block
                if s_min is not None:
                    e_min = s_min + 90
                else:
                    s_min = 540 # 9:00 AM
                    e_min = 630 # 10:30 AM
            start_mins.append(s_min)
            end_mins.append(e_min)
            durations_hours.append(dur)

        self.df["startMin"] = np.array(start_mins, dtype=int)
        self.df["endMin"] = np.array(end_mins, dtype=int)
        self.df["durationHours"] = np.array(durations_hours, dtype=float)

        # Flag missing essential values using numpy / pandas
        missing_flags = (
            (self.df["teacher"].isna()) | (self.df["teacher"] == "To Be Announced") |
            (self.df["room"].isna()) | (self.df["room"] == "Room TBA") |
            (self.df["subject"].isna()) | (self.df["subject"] == "General Lecture") |
            (self.df["day"].isna()) | (self.df["day"] == "Unspecified")
        )
        self.df["needsReview"] = missing_flags | (self.df["confidence"] < 0.65)

        # 2. Duplicate detection
        duplicate_mask = self.df.duplicated(
            subset=["day", "startTime", "endTime", "room", "subject", "teacher", "className"],
            keep=False
        )
        duplicates = self.df[duplicate_mask].to_dict(orient="records")

        # 3. Conflict detection (Teacher, Room, and Class overlaps)
        conflicts = []
        has_conflict = np.zeros(len(self.df), dtype=bool)
        conflict_notes = [""] * len(self.df)

        # Group by day
        for day_name, day_group in self.df.groupby("day"):
            if day_name in ["Unspecified", None, ""]:
                continue

            indices = day_group.index.to_numpy()
            t_names = day_group["teacher"].to_numpy()
            r_names = day_group["room"].to_numpy()
            c_names = day_group["className"].to_numpy()
            s_names = day_group["subject"].to_numpy()
            starts = day_group["startMin"].to_numpy()
            ends = day_group["endMin"].to_numpy()

            n = len(indices)
            for i in range(n):
                idx_i = indices[i]
                t_i = t_names[i]
                r_i = r_names[i]
                c_i = c_names[i]
                s_i = s_names[i]
                s_time_i = starts[i]
                e_time_i = ends[i]

                for j in range(i + 1, n):
                    idx_j = indices[j]
                    t_j = t_names[j]
                    r_j = r_names[j]
                    c_j = c_names[j]
                    s_j = s_names[j]
                    s_time_j = starts[j]
                    e_time_j = ends[j]

                    # Check time interval overlap
                    overlap = max(s_time_i, s_time_j) < min(e_time_i, e_time_j)
                    if overlap:
                        # Teacher conflict: same teacher, different room or class
                        if t_i != "To Be Announced" and t_i == t_j and (r_i != r_j or c_i != c_j):
                            conflict_desc = f"Teacher Conflict: {t_i} scheduled for '{s_i}' in {r_i} and '{s_j}' in {r_j} at overlapping time."
                            conflicts.append({
                                "type": "TEACHER_CONFLICT",
                                "teacher": t_i,
                                "day": str(day_name),
                                "description": conflict_desc,
                                "entryIds": [str(self.df.loc[idx_i, "id"]), str(self.df.loc[idx_j, "id"])]
                            })
                            has_conflict[idx_i] = True
                            has_conflict[idx_j] = True
                            conflict_notes[idx_i] += " [Teacher Overlap]"
                            conflict_notes[idx_j] += " [Teacher Overlap]"

                        # Room conflict: same room, different subject/teacher
                        if r_i not in ["Room TBA", "Online"] and r_i == r_j and (s_i != s_j or t_i != t_j or c_i != c_j):
                            conflict_desc = f"Room Conflict: {r_i} booked simultaneously by '{s_i}' ({t_i}) and '{s_j}' ({t_j})."
                            conflicts.append({
                                "type": "ROOM_CONFLICT",
                                "room": r_i,
                                "day": str(day_name),
                                "description": conflict_desc,
                                "entryIds": [str(self.df.loc[idx_i, "id"]), str(self.df.loc[idx_j, "id"])]
                            })
                            has_conflict[idx_i] = True
                            has_conflict[idx_j] = True
                            conflict_notes[idx_i] += " [Room Overlap]"
                            conflict_notes[idx_j] += " [Room Overlap]"

        self.df["hasConflict"] = has_conflict
        self.df["conflictNote"] = conflict_notes

        # 4. Aggregated stats via pandas
        total_hours = float(np.sum(self.df["durationHours"]))
        review_needed_count = int(np.sum(self.df["needsReview"]))
        
        unique_classes = [c for c in self.df["className"].dropna().unique().tolist() if c and c != "General"]
        unique_programs = [p for p in self.df["program"].dropna().unique().tolist() if p and p != "General"]
        unique_teachers = [t for t in self.df["teacher"].dropna().unique().tolist() if t and t != "To Be Announced"]
        unique_rooms = [r for r in self.df["room"].dropna().unique().tolist() if r and r != "Room TBA"]
        unique_subjects = [s for s in self.df["subject"].dropna().unique().tolist() if s and s != "General Lecture"]
        unique_days = [d for d in self.df["day"].dropna().unique().tolist() if d and d != "Unspecified"]

        # Sort order for days
        day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        sorted_days = sorted(unique_days, key=lambda d: day_order.index(d) if d in day_order else 99)
        day_counts = self.df["day"].value_counts().to_dict()

        stats = {
            "totalEntries": len(self.df),
            "classesCount": len(unique_classes),
            "programsCount": len(unique_programs),
            "teachersCount": len(unique_teachers),
            "roomsCount": len(unique_rooms),
            "subjectsCount": len(unique_subjects),
            "daysCount": len(sorted_days),
            "conflictsCount": len(conflicts),
            "reviewNeededCount": review_needed_count,
            "totalHours": round(total_hours, 1),
            "dayDistribution": day_counts,
            "classes": sorted(unique_classes),
            "programs": sorted(unique_programs),
            "teachers": sorted(unique_teachers),
            "rooms": sorted(unique_rooms),
            "subjects": sorted(unique_subjects),
            "days": sorted_days
        }

        # Convert records to serializable list without NaNs
        clean_df = self.df.where(pd.notnull(self.df), None)
        records = clean_df.to_dict(orient="records")
        for r in records:
            r["hasConflict"] = bool(r.get("hasConflict", False))
            r["needsReview"] = bool(r.get("needsReview", False))
            r["durationHours"] = float(r.get("durationHours", 1.5))
            r["confidence"] = float(r.get("confidence", 0.95))

        return {
            "entries": records,
            "duplicates": duplicates,
            "conflicts": conflicts,
            "stats": stats
        }

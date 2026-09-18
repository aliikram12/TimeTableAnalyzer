"""
Exporter Service Module
Provides high-fidelity, professional PDF, Excel, and CSV generation.
Uses ReportLab with custom layouts for Class Schedules, Teacher Schedules, Room Schedules,
and Full Master Timetables with rich Skeuomorphic and Neumorphic visual styling:
- Multi-tone embossed headers with gold accent rims
- Vibrant day section pill badges (Sapphire, Emerald, Amethyst, Amber, Crimson)
- Soft alternating row tints and tactile borders
- Official running headers and page-count footer badges
"""

import os
from typing import List, Dict, Any, Optional
import pandas as pd
from datetime import datetime

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfgen import canvas

DAY_COLOR_HEX = {
    "Monday": ("#E76F51", "#FCEFE3", "#8B3A20"),
    "Tuesday": ("#2A9D8F", "#E8F8F5", "#1B6D62"),
    "Wednesday": ("#F4A261", "#FEF4EB", "#873600"),
    "Thursday": ("#E9C46A", "#FEF9E7", "#7D6608"),
    "Friday": ("#C0392B", "#FDEDEC", "#78281F"),
    "Saturday": ("#8D6E63", "#EFEBE9", "#4E342E"),
    "Sunday": ("#7A6559", "#F5EBE6", "#3D2B1F"),
}

class NumberedCanvas(canvas.Canvas):
    """Adds professional 'Page X of Y' footer, two-line border, and neumorphic running header to every page."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        w, h = self._pagesize

        # 1. Two-Lines Border (Margin with Double Line Frame)
        # Outer Line: Vibrant Terracotta (#E76F51) - 1.5pt thickness
        self.setStrokeColor(colors.HexColor("#E76F51"))
        self.setLineWidth(1.5)
        self.roundRect(14, 14, w - 28, h - 28, 4, fill=0, stroke=1)

        # Inner Line: Warm Peach Cream Border (#D4B8A0) - 0.75pt thickness
        self.setStrokeColor(colors.HexColor("#D4B8A0"))
        self.setLineWidth(0.75)
        self.roundRect(18, 18, w - 36, h - 36, 2, fill=0, stroke=1)

        # 2. Top Accent Bar (Warm Terracotta & Espresso)
        self.setFillColor(colors.HexColor("#3D2B1F"))
        self.rect(18, h - 25, w - 36, 5, fill=1, stroke=0)
        self.setFillColor(colors.HexColor("#E76F51"))
        self.rect(18, h - 25, (w - 36) * 0.45, 5, fill=1, stroke=0)
        self.setFillColor(colors.HexColor("#F4A261"))
        self.rect(18 + (w - 36) * 0.45, h - 25, 30, 5, fill=1, stroke=0)

        # Running subtle subheader
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#A0897D"))
        self.drawString(28, h - 33, "Smart Timetable Analyzer • Official Academic Grid")
        self.setStrokeColor(colors.HexColor("#D4B8A0"))
        self.setLineWidth(0.5)
        self.line(28, h - 36, w - 28, h - 36)

        # 3. Embossed Dual Footer Rules
        self.setStrokeColor(colors.HexColor("#D4B8A0"))
        self.setLineWidth(0.75)
        self.line(28, 30, w - 28, 30)
        self.setStrokeColor(colors.HexColor("#FFFFFF"))
        self.setLineWidth(0.75)
        self.line(28, 29, w - 28, 29)

        # Footer Left text
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#A0897D"))
        self.drawString(28, 18, f"Generated on {datetime.now().strftime('%d %B %Y, %I:%M %p')} • Verified Master Dataset")

        # Footer Right Pill Badge
        page_text = f"Page {self._pageNumber} of {page_count}"
        badge_w = 75
        self.setFillColor(colors.HexColor("#FCEFE3"))
        self.roundRect(w - 28 - badge_w, 14, badge_w, 14, 3, fill=1, stroke=0)
        self.setStrokeColor(colors.HexColor("#D4B8A0"))
        self.setLineWidth(0.5)
        self.roundRect(w - 28 - badge_w, 14, badge_w, 14, 3, fill=0, stroke=1)
        self.setFont("Helvetica-Bold", 7)
        self.setFillColor(colors.HexColor("#3D2B1F"))
        self.drawCentredString(w - 28 - (badge_w / 2), 18, page_text)

        self.restoreState()

class TimetableExporter:
    @staticmethod
    def export_csv(entries: List[Dict[str, Any]], output_path: str) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        records = []
        for e in entries:
            records.append({
                "Day": e.get("day", ""),
                "StartTime": e.get("startTime", ""),
                "EndTime": e.get("endTime", ""),
                "Time": e.get("time", ""),
                "Subject": e.get("subject", ""),
                "CourseCode": e.get("courseCode", ""),
                "Teacher": e.get("teacher", ""),
                "Room": e.get("room", ""),
                "Class": e.get("className") or e.get("displayName", ""),
                "Program": e.get("program", ""),
                "Semester": e.get("semester", ""),
                "Section": e.get("section", ""),
                "Shift": e.get("shift", ""),
                "Batch": e.get("batch", "")
            })
        df = pd.DataFrame(records)
        df.to_csv(output_path, index=False, encoding="utf-8-sig")
        return output_path

    @staticmethod
    def export_excel(entries: List[Dict[str, Any]], output_path: str) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        records = []
        for e in entries:
            records.append({
                "Day": e.get("day", ""),
                "Start Time": e.get("startTime", ""),
                "End Time": e.get("endTime", ""),
                "Time Slot": e.get("time", ""),
                "Subject": e.get("subject", ""),
                "Course Code": e.get("courseCode", ""),
                "Teacher": e.get("teacher", ""),
                "Room": e.get("room", ""),
                "Class Name": e.get("className") or e.get("displayName", ""),
                "Program": e.get("program", ""),
                "Semester": e.get("semester", ""),
                "Section": e.get("section", ""),
                "Shift": e.get("shift", ""),
                "Batch": e.get("batch", "")
            })
        df = pd.DataFrame(records)
        df.to_excel(output_path, index=False, engine="openpyxl", sheet_name="Timetable")
        return output_path

    @staticmethod
    def export_pdf(
        entries: List[Dict[str, Any]],
        output_path: str,
        export_type: str = "full",
        filter_val: Optional[str] = None,
        filter_meta: Optional[Dict[str, Any]] = None
    ) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        is_landscape = (export_type == "full")
        page_size = landscape(letter) if is_landscape else letter
        
        doc = SimpleDocTemplate(
            output_path,
            pagesize=page_size,
            leftMargin=30,
            rightMargin=30,
            topMargin=38,
            bottomMargin=38
        )

        styles = getSampleStyleSheet()
        
        banner_title_style = ParagraphStyle(
            "BannerTitle",
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=colors.white
        )
        banner_sub_style = ParagraphStyle(
            "BannerSub",
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#FCEFE3")
        )
        banner_badge_style = ParagraphStyle(
            "BannerBadge",
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#F4A261"),
            alignment=2 # Right
        )
        
        meta_cell_label = ParagraphStyle(
            "MetaLabel",
            fontName="Helvetica-Bold",
            fontSize=7,
            leading=9,
            textColor=colors.HexColor("#A0897D")
        )
        meta_cell_val = ParagraphStyle(
            "MetaVal",
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#3D2B1F")
        )

        cell_header_style = ParagraphStyle(
            "CellHeader",
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.white
        )
        cell_style = ParagraphStyle(
            "CellNormal",
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#3D2B1F")
        )
        cell_bold_style = ParagraphStyle(
            "CellBold",
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#3D2B1F")
        )

        story = []
        day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        def s(v: Any) -> str:
            return "" if v is None else str(v)

        # Helper to create tactile 3D header banner table
        def build_header_banner(title_text: str, subtitle_text: str, badge_text: str = "OFFICIAL SCHEDULE", table_w: float = 552):
            banner_data = [
                [
                    Paragraph(f"<b>{s(title_text).upper()}</b>", banner_title_style),
                    Paragraph(f"<font color='#E76F51'>●</font> <b>{s(badge_text)}</b>", banner_badge_style)
                ],
                [
                    Paragraph(s(subtitle_text), banner_sub_style),
                    Paragraph(f"ACADEMIC YEAR 2025–2026", banner_badge_style)
                ]
            ]
            t = Table(banner_data, colWidths=[table_w * 0.72, table_w * 0.28])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#3D2B1F")),
                ("LINEBELOW", (0, 1), (-1, 1), 2.5, colors.HexColor("#E76F51")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]))
            return t

        # Helper to create Neumorphic Metadata Cards strip
        def build_meta_strip(items: List[tuple], table_w: float = 552):
            col_w = table_w / max(1, len(items))
            row1 = [Paragraph(s(k).upper(), meta_cell_label) for k, _ in items]
            row2 = [Paragraph(f"<b>{s(v)}</b>", meta_cell_val) for _, v in items]
            t = Table([row1, row2], colWidths=[col_w] * len(items))
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FCEFE3")),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#D4B8A0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5CEBC")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            return t

        # Helper to build Day Section Banner
        def build_day_heading(day_name: str, count: int, table_w: float = 552):
            primary_hex, bg_hex, text_hex = DAY_COLOR_HEX.get(day_name, ("#E76F51", "#FCEFE3", "#8B3A20"))
            p = Paragraph(f"<b><font color='{text_hex}'>{day_name.upper()}</font></b> &nbsp;&nbsp;<font color='#A0897D' size='7'>({count} sessions)</font>", cell_bold_style)
            t = Table([[p]], colWidths=[table_w])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg_hex)),
                ("LINEBEFORE", (0, 0), (0, 0), 3.5, colors.HexColor(primary_hex)),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D4B8A0")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]))
            return t

        # -------------------------------------------------------------
        # 1. CLASS SCHEDULE PDF
        # -------------------------------------------------------------
        if export_type == "class":
            class_title = filter_val or (entries[0].get("className") if entries else "Class")
            story.append(build_header_banner(
                f"Class Timetable: {class_title}",
                "Department of Software Engineering • University Timetable",
                "OFFICIAL CLASS GRID",
                552
            ))
            story.append(Spacer(1, 8))

            sample = entries[0] if entries else {}
            meta_items = [
                ("Program", s(sample.get("program")) or "N/A"),
                ("Semester", f"Semester {s(sample.get('semester')) or 'N/A'}"),
                ("Section", f"Section {s(sample.get('section')) or 'N/A'}"),
                ("Total Classes", f"{len(entries)} lectures"),
                ("Batch", s(sample.get("batch")) or "2025-2029")
            ]
            story.append(build_meta_strip(meta_items, 552))
            story.append(Spacer(1, 10))

            day_groups: Dict[str, List[Dict[str, Any]]] = {}
            for e in entries:
                d = e.get("day", "Monday")
                if d not in day_groups:
                    day_groups[d] = []
                day_groups[d].append(e)

            for day_name in day_order:
                if day_name not in day_groups or not day_groups[day_name]:
                    continue
                day_entries = sorted(day_groups[day_name], key=lambda x: x.get("startTime", "") or "")
                
                story.append(build_day_heading(day_name, len(day_entries), 552))
                story.append(Spacer(1, 2))

                primary_hex, _, _ = DAY_COLOR_HEX.get(day_name, ("#1E40AF", "#EFF6FF", "#1E3A8A"))
                table_data = [[
                    Paragraph("Time Slot", cell_header_style),
                    Paragraph("Course / Subject", cell_header_style),
                    Paragraph("Teacher", cell_header_style),
                    Paragraph("Room / Lab", cell_header_style)
                ]]
                for le in day_entries:
                    subj = s(le.get("subject"))
                    if le.get("courseCode"):
                        subj += f" &nbsp;<b>[{s(le.get('courseCode'))}]</b>"
                    table_data.append([
                        Paragraph(s(le.get("time")), cell_bold_style),
                        Paragraph(subj, cell_style),
                        Paragraph(s(le.get("teacher")), cell_style),
                        Paragraph(f"<b>{s(le.get('room'))}</b>", cell_style)
                    ])

                t = Table(table_data, colWidths=[120, 220, 132, 80])
                t.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(primary_hex)),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5CEBC")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFF8F2"), colors.HexColor("#FCEFE3")]),
                ]))
                story.append(t)
                story.append(Spacer(1, 8))

        # -------------------------------------------------------------
        # 2. TEACHER SCHEDULE PDF
        # -------------------------------------------------------------
        elif export_type == "teacher":
            teacher_name = filter_val or (entries[0].get("teacher") if entries else "Faculty Member")
            story.append(build_header_banner(
                f"Faculty Schedule: {teacher_name}",
                "Official Weekly Teaching Schedule • Department of Software Engineering",
                "FACULTY ROSTER",
                552
            ))
            story.append(Spacer(1, 8))

            total_hours = round(sum(float(e.get("durationHours", 1.5) or 1.5) for e in entries), 1)
            unique_days = len(set(e.get("day") for e in entries if e.get("day")))
            unique_rooms = len(set(e.get("room") for e in entries if e.get("room")))

            meta_items = [
                ("Total Lectures", f"{len(entries)} classes"),
                ("Teaching Load", f"{total_hours} hrs/week"),
                ("Active Days", f"{unique_days} days"),
                ("Locations", f"{unique_rooms} rooms/labs")
            ]
            story.append(build_meta_strip(meta_items, 552))
            story.append(Spacer(1, 10))

            table_data = [[
                Paragraph("Day", cell_header_style),
                Paragraph("Time Slot", cell_header_style),
                Paragraph("Course / Subject", cell_header_style),
                Paragraph("Class / Section", cell_header_style),
                Paragraph("Room", cell_header_style)
            ]]

            sorted_entries = sorted(entries, key=lambda x: (
                day_order.index(x.get("day")) if x.get("day") in day_order else 99,
                x.get("startTime", "") or ""
            ))

            for le in sorted_entries:
                subj = s(le.get("subject"))
                if le.get("courseCode"):
                    subj += f" &nbsp;<b>[{s(le.get('courseCode'))}]</b>"
                c_name = s(le.get("className") or le.get("displayName"))
                table_data.append([
                    Paragraph(s(le.get("day")), cell_bold_style),
                    Paragraph(s(le.get("time")), cell_style),
                    Paragraph(subj, cell_style),
                    Paragraph(c_name, cell_style),
                    Paragraph(f"<b>{s(le.get('room'))}</b>", cell_style)
                ])

            t = Table(table_data, colWidths=[72, 100, 170, 140, 70])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#C05633")), # Vibrant Terracotta
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5CEBC")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFF8F2"), colors.HexColor("#FCEFE3")]),
            ]))
            story.append(t)

        # -------------------------------------------------------------
        # 3. ROOM SCHEDULE PDF
        # -------------------------------------------------------------
        elif export_type == "room":
            room_name = filter_val or (entries[0].get("room") if entries else "Room")
            story.append(build_header_banner(
                f"Room Schedule & Occupancy: {room_name}",
                "Official Facility Utilization Schedule • Department of Software Engineering",
                "ROOM DISPATCH",
                552
            ))
            story.append(Spacer(1, 8))

            meta_items = [
                ("Facility", s(room_name)),
                ("Scheduled Sessions", f"{len(entries)} lectures"),
                ("Utilization Status", "Active Academic"),
                ("Department", "Software Engineering")
            ]
            story.append(build_meta_strip(meta_items, 552))
            story.append(Spacer(1, 10))

            table_data = [[
                Paragraph("Day", cell_header_style),
                Paragraph("Time Slot", cell_header_style),
                Paragraph("Subject", cell_header_style),
                Paragraph("Teacher", cell_header_style),
                Paragraph("Class / Section", cell_header_style)
            ]]

            sorted_entries = sorted(entries, key=lambda x: (
                day_order.index(x.get("day")) if x.get("day") in day_order else 99,
                x.get("startTime", "") or ""
            ))

            for le in sorted_entries:
                subj = s(le.get("subject"))
                if le.get("courseCode"):
                    subj += f" &nbsp;<b>[{s(le.get('courseCode'))}]</b>"
                c_name = s(le.get("className") or le.get("displayName"))
                table_data.append([
                    Paragraph(s(le.get("day")), cell_bold_style),
                    Paragraph(s(le.get("time")), cell_style),
                    Paragraph(subj, cell_style),
                    Paragraph(s(le.get("teacher")), cell_style),
                    Paragraph(c_name, cell_style)
                ])

            t = Table(table_data, colWidths=[72, 100, 160, 120, 100])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2A9D8F")), # Emerald Teal
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5CEBC")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFF8F2"), colors.HexColor("#FCEFE3")]),
            ]))
            story.append(t)

        # -------------------------------------------------------------
        # 4. FULL MASTER TIMETABLE PDF (Landscape Multi-page)
        # -------------------------------------------------------------
        else:
            story.append(build_header_banner(
                "University Master Timetable",
                "Comprehensive Multi-Department Schedule • Verified Database Snapshot",
                "MASTER LEDGER",
                732
            ))
            story.append(Spacer(1, 8))

            unique_teachers = len(set(e.get("teacher") for e in entries if e.get("teacher")))
            unique_rooms = len(set(e.get("room") for e in entries if e.get("room")))
            meta_items = [
                ("Total Classes", f"{len(entries)} scheduled sessions"),
                ("Faculty Involved", f"{unique_teachers} teachers"),
                ("Active Rooms", f"{unique_rooms} rooms/labs"),
                ("Department", "Software Engineering")
            ]
            story.append(build_meta_strip(meta_items, 732))
            story.append(Spacer(1, 10))

            table_data = [[
                Paragraph("Day", cell_header_style),
                Paragraph("Time Slot", cell_header_style),
                Paragraph("Course / Subject", cell_header_style),
                Paragraph("Teacher", cell_header_style),
                Paragraph("Room", cell_header_style),
                Paragraph("Class Name", cell_header_style),
                Paragraph("Section", cell_header_style)
            ]]

            sorted_entries = sorted(entries, key=lambda x: (
                day_order.index(x.get("day")) if x.get("day") in day_order else 99,
                x.get("startTime", "") or "",
                x.get("room", "") or ""
            ))

            for le in sorted_entries:
                subj = s(le.get("subject"))
                if le.get("courseCode"):
                    subj += f" &nbsp;<b>[{s(le.get('courseCode'))}]</b>"
                c_name = s(le.get("className") or le.get("displayName"))
                table_data.append([
                    Paragraph(s(le.get("day")), cell_bold_style),
                    Paragraph(s(le.get("time")), cell_style),
                    Paragraph(subj, cell_style),
                    Paragraph(s(le.get("teacher")), cell_style),
                    Paragraph(f"<b>{s(le.get('room'))}</b>", cell_style),
                    Paragraph(c_name, cell_style),
                    Paragraph(s(le.get("section")), cell_style)
                ])

            t = Table(table_data, colWidths=[65, 95, 172, 130, 65, 140, 65], repeatRows=1)
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3D2B1F")),
                ("LINEBELOW", (0, 0), (-1, 0), 2, colors.HexColor("#E76F51")),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5CEBC")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFF8F2"), colors.HexColor("#FCEFE3")]),
            ]))
            story.append(t)

        def draw_bg(c, d):
            c.saveState()
            c.setFillColor(colors.HexColor("#FFF8F2"))
            c.rect(0, 0, d.pagesize[0], d.pagesize[1], fill=1, stroke=0)
            c.restoreState()

        doc.build(story, canvasmaker=NumberedCanvas, onFirstPage=draw_bg, onLaterPages=draw_bg)
        return output_path

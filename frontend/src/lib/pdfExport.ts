import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TimetableEntry } from "../types";

export interface PdfExportOptions {
  orientation?: "landscape" | "portrait";
  accentColor?: string;
  category?: string;
}

// Harmonious Peach Cream & Terracotta Palette for Days
const DAY_COLORS: Record<string, { primary: [number, number, number]; bg: [number, number, number]; text: [number, number, number]; hex: string }> = {
  Monday: { primary: [231, 111, 81], bg: [252, 239, 227], text: [139, 58, 32], hex: "#E76F51" },
  Tuesday: { primary: [42, 157, 143], bg: [232, 248, 245], text: [27, 109, 98], hex: "#2A9D8F" },
  Wednesday: { primary: [244, 162, 97], bg: [254, 244, 235], text: [135, 54, 0], hex: "#F4A261" },
  Thursday: { primary: [233, 196, 106], bg: [254, 249, 231], text: [125, 102, 8], hex: "#E9C46A" },
  Friday: { primary: [192, 57, 43], bg: [253, 237, 236], text: [120, 40, 31], hex: "#C0392B" },
  Saturday: { primary: [141, 110, 99], bg: [239, 235, 233], text: [78, 52, 46], hex: "#8D6E63" },
  Sunday: { primary: [122, 101, 89], bg: [245, 235, 230], text: [61, 43, 31], hex: "#7A6559" },
  Other: { primary: [231, 111, 81], bg: [252, 239, 227], text: [139, 58, 32], hex: "#E76F51" },
};

export function exportScheduleToPDF(
  entries: TimetableEntry[],
  title: string,
  subtitle: string,
  metaInfo?: Record<string, string>,
  options?: PdfExportOptions
) {
  const isLandscape = options?.orientation !== "portrait";
  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "pt",
    format: "letter"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Soft Warm Peach Background Fill on initial page (#FFF8F2)
  doc.setFillColor(255, 248, 242);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // -------------------------------------------------------------
  // 1. SKEUOMORPHIC & NEUMORPHIC 3D HEADER BANNER (Peach & Terracotta)
  // -------------------------------------------------------------
  const headerY = 24;
  const headerH = 46;
  const headerX = 24;
  const headerW = pageWidth - 48;

  // Base dark espresso slab (#3D2B1F)
  doc.setFillColor(61, 43, 31);
  doc.roundedRect(headerX, headerY, headerW, headerH, 4, 4, "F");

  // Middle vibrant terracotta strip (#C05633)
  doc.setFillColor(192, 86, 51);
  doc.rect(headerX, headerY + 4, headerW, headerH - 8, "F");

  // Top specular highlight reflection (#F4A261)
  doc.setFillColor(244, 162, 97);
  doc.rect(headerX, headerY + 4, headerW, 2, "F");

  // Bottom embossed terracotta rim (#E76F51)
  doc.setFillColor(231, 111, 81);
  doc.rect(headerX, headerY + headerH - 3, headerW, 3, "F");

  // Official STA Emblem Badge on Left
  doc.setFillColor(231, 111, 81);
  doc.roundedRect(headerX + 10, headerY + 6, 34, 34, 5, 5, "F");
  doc.setDrawColor(244, 162, 97);
  doc.setLineWidth(1);
  doc.roundedRect(headerX + 10, headerY + 6, 34, 34, 5, 5, "S");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("STA", headerX + 27, headerY + 28, { align: "center" });

  // Main Header Title with crisp contrast
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const displayTitle = title.length > 48 ? title.substring(0, 45) + "..." : title;
  doc.text(displayTitle.toUpperCase(), headerX + 52, headerY + 23);

  // Subtitle / Academic Tagline
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(252, 239, 227); // #FCEFE3 Soft Peach
  const displaySub = subtitle.length > 70 ? subtitle.substring(0, 67) + "..." : subtitle;
  doc.text(`${displaySub} • Smart Timetable Analyzer`, headerX + 52, headerY + 36);

  // Right-side Tactile Status Pill: "VERIFIED ACADEMIC GRID"
  const pillW = 140;
  const pillH = 22;
  const pillX = headerX + headerW - pillW - 10;
  const pillY = headerY + 12;

  doc.setFillColor(61, 43, 31);
  doc.roundedRect(pillX - 1, pillY - 1, pillW + 2, pillH + 2, 11, 11, "F");
  doc.setFillColor(252, 239, 227);
  doc.roundedRect(pillX, pillY, pillW, pillH, 10, 10, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(192, 86, 51);
  doc.text("VERIFIED ACADEMIC GRID", pillX + (pillW / 2), pillY + 14, { align: "center" });

  // -------------------------------------------------------------
  // 2. NEUMORPHIC METADATA TILES STRIP
  // -------------------------------------------------------------
  let currentY = headerY + headerH + 8;
  const metaEntries = Object.entries(metaInfo || {}).filter(([_, val]) => !!val);

  if (metaEntries.length > 0) {
    const cardWidth = Math.min(150, (pageWidth - 48 - (metaEntries.length - 1) * 8) / metaEntries.length);
    let cardX = 24;

    metaEntries.forEach(([key, val]) => {
      // Outer soft shadow simulation
      doc.setFillColor(229, 206, 188);
      doc.roundedRect(cardX + 1, currentY + 1, cardWidth, 24, 4, 4, "F");

      // Raised Card Face (#FCEFE3)
      doc.setFillColor(252, 239, 227);
      doc.roundedRect(cardX, currentY, cardWidth, 24, 4, 4, "F");
      
      // Top specular sheen (white)
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1);
      doc.line(cardX + 3, currentY, cardX + cardWidth - 3, currentY);

      // Bottom ambient border (#D4B8A0)
      doc.setDrawColor(212, 184, 160);
      doc.line(cardX, currentY + 24, cardX + cardWidth, currentY + 24);

      // Card Text Content
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(160, 137, 125); // #A0897D
      doc.text(key.toUpperCase(), cardX + 7, currentY + 9);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(61, 43, 31); // #3D2B1F
      const displayVal = val.length > 20 ? val.substring(0, 18) + "..." : val;
      doc.text(displayVal, cardX + 7, currentY + 19);

      cardX += cardWidth + 8;
    });

    currentY += 30;
  }

  // -------------------------------------------------------------
  // 3. SORT & PREPARE SCHEDULE ENTRIES
  // -------------------------------------------------------------
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sorted = [...entries].sort((a, b) => {
    const dA = dayOrder.indexOf(a.day);
    const dB = dayOrder.indexOf(b.day);
    if (dA !== dB) return (dA === -1 ? 99 : dA) - (dB === -1 ? 99 : dB);
    return (a.startTime || "").localeCompare(b.startTime || "");
  });

  const hasEntries = sorted.length > 0;
  const tableRows = hasEntries
    ? sorted.map((e) => {
        const day = e.day || "Other";
        const courseCode = e.courseCode ? ` [${e.courseCode}]` : "";
        const subject = `${e.subject || "Session"}${courseCode}`;
        const room = e.room ? `${e.room}` : "TBA";
        const teacher = e.teacher || "Faculty TBA";
        const classDetail = e.className || e.displayName || `${e.program || ""} ${e.semester ? `Sem ${e.semester}` : ""} ${e.section ? `Sec ${e.section}` : ""}`.trim() || "-";

        return [
          day,
          e.time || "-",
          subject,
          teacher,
          room,
          classDetail
        ];
      })
    : [
        [
          "Notice",
          "-",
          `No schedule sessions found matching the current filter criteria (${subtitle || "applied filter"}).`,
          "-",
          "-",
          "-"
        ]
      ];

  // -------------------------------------------------------------
  // 4. COLORFUL AUTOTABLE WITH SKEUOMORPHIC CELLS & DAY HIGHLIGHTS
  // -------------------------------------------------------------
  autoTable(doc, {
    startY: currentY + 4,
    head: [["DAY", "TIME SLOT", "COURSE / SUBJECT", "TEACHER", "ROOM / LAB", "CLASS & SECTION"]],
    body: tableRows,
    theme: "plain",
    showHead: "everyPage",
    margin: { left: 24, right: 24, top: 48, bottom: 42 },
    headStyles: {
      fillColor: [61, 43, 31], // #3D2B1F Deep Espresso Slab
      textColor: [255, 248, 242], // #FFF8F2
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      cellPadding: 5.5,
    },
    alternateRowStyles: {
      fillColor: [252, 239, 227], // #FCEFE3 soft warm peach for alternate rows
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: "bold" },
      1: { cellWidth: 90, fontStyle: "bold" },
      2: { cellWidth: "auto", fontStyle: "bold" },
      3: { cellWidth: 125 },
      4: { cellWidth: 75 },
      5: { cellWidth: 140 },
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 4.5,
      textColor: [61, 43, 31],
      lineWidth: 0.5,
      lineColor: [229, 206, 188], // #E5CEBC subtle warm grid rule
      valign: "middle",
      overflow: "linebreak",
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        if (data.column.index === 0) {
          const rawDay = (data.row.raw as string[])[0] || "Other";
          const dayColor = DAY_COLORS[rawDay] || DAY_COLORS["Other"];
          data.cell.styles.fillColor = dayColor.bg;
          data.cell.styles.textColor = dayColor.text;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    willDrawPage: (data) => {
      // On pages 2+, fill background with soft peach cream BEFORE table cells are drawn
      if (data.pageNumber > 1) {
        doc.setFillColor(255, 248, 242);
        doc.rect(0, 0, pageWidth, pageHeight, "F");
      }
    },
    didDrawCell: (data) => {
      if (data.section === "head") {
        // Draw terracotta top highlight on header cells
        doc.setDrawColor(231, 111, 81);
        doc.setLineWidth(1);
        doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
      } else if (data.section === "body" && data.column.index === 0) {
        // Draw crisp day accent stripe on left border
        const rawDay = (data.row.raw as string[])[0] || "Other";
        const dayColor = DAY_COLORS[rawDay] || DAY_COLORS["Other"];
        doc.setDrawColor(dayColor.primary[0], dayColor.primary[1], dayColor.primary[2]);
        doc.setLineWidth(2);
        doc.line(data.cell.x + 1, data.cell.y + 1, data.cell.x + 1, data.cell.y + data.cell.height - 1);
      }
    },
    didDrawPage: (data) => {
      // -----------------------------------------------------------
      // TWO LINES BORDER (Margin with Double Line Frame) ON EVERY PAGE
      // -----------------------------------------------------------
      // Outer Line: Vibrant Terracotta (#E76F51) - 1.5pt thickness
      doc.setDrawColor(231, 111, 81);
      doc.setLineWidth(1.5);
      doc.roundedRect(14, 14, pageWidth - 28, pageHeight - 28, 4, 4, "S");

      // Inner Line: Warm Peach Cream Border (#D4B8A0) - 0.75pt thickness
      doc.setDrawColor(212, 184, 160);
      doc.setLineWidth(0.75);
      doc.roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 2, 2, "S");

      // Top running subheader on subsequent pages
      if (data.pageNumber > 1) {
        doc.setFillColor(61, 43, 31);
        doc.roundedRect(24, 22, pageWidth - 48, 18, 3, 3, "F");
        doc.setFillColor(231, 111, 81);
        doc.rect(24, 22, 110, 18, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text("SMART TIMETABLE", 32, 33.5);
        doc.setTextColor(252, 239, 227);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const contTitle = `${title.toUpperCase()} • CONTINUED`;
        doc.text(contTitle.length > 80 ? contTitle.slice(0, 77) + "..." : contTitle, 145, 33.5);
      }

      // -----------------------------------------------------------
      // SKEUOMORPHIC & NEUMORPHIC RUNNING FOOTER
      // -----------------------------------------------------------
      const footerY = pageHeight - 24;

      // Bottom embossed decorative divider rule
      doc.setDrawColor(212, 184, 160); // #D4B8A0
      doc.setLineWidth(0.75);
      doc.line(24, footerY - 8, pageWidth - 24, footerY - 8);
      
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.75);
      doc.line(24, footerY - 7, pageWidth - 24, footerY - 7);

      // Footer branding & metadata
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 137, 125);
      doc.text(
        `Smart Timetable Analyzer • Generated on ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} • Official Master Ledger`,
        24,
        footerY + 4
      );

      // Page Badge on Right (Raised 3D pill)
      const pageStr = `Page ${data.pageNumber}`;
      doc.setFillColor(252, 239, 227);
      doc.roundedRect(pageWidth - 84, footerY - 6, 58, 14, 3, 3, "F");
      doc.setDrawColor(212, 184, 160);
      doc.setLineWidth(0.5);
      doc.roundedRect(pageWidth - 84, footerY - 6, 58, 14, 3, 3, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(61, 43, 31);
      doc.text(pageStr, pageWidth - 55, footerY + 4, { align: "center" });
    }
  });

  // Save the generated colorful PDF
  const safeFilename = title.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
  doc.save(`${safeFilename}_official_schedule.pdf`);
}

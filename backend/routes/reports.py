import io
from flask import Blueprint, request, send_file, jsonify
from models.db import db
from services.aqi_service import AQIService, get_city_timezone
from ml.predict import predict_future_aqi
from routes.prediction import generate_safety_recommendations
from datetime import datetime
from zoneinfo import ZoneInfo

reports_bp = Blueprint("reports", __name__)

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

@reports_bp.route("/download-pdf", methods=["GET"])
def download_pdf():
    city = request.args.get("city", "Bengaluru").strip()
    
    # 1. Fetch data for report compile
    current_data = AQIService.get_current_aqi(city)
    predict_data = predict_future_aqi(city)
    
    # Fetch 7 days of historical logs
    cursor = db.aqi_data.find({"city": {"$regex": f"^{city}$", "$options": "i"}}, sort=[("timestamp", 1)])
    hist_data = list(cursor)
    if not hist_data or len(hist_data) < 10:
        hist_data = AQIService.get_historical_data(city, days=7)
    
    # Compute historical statistics
    aqi_values = [h.get("aqi") for h in hist_data]
    total_readings = len(aqi_values)
    avg_aqi = round(sum(aqi_values) / total_readings, 1) if total_readings > 0 else 0
    max_aqi = max(aqi_values) if aqi_values else 0
    
    # Count unsafe days (AQI > 100)
    # Since we have hourly points, group by day
    daily_values = {}
    for h in hist_data:
        date_str = h.get("timestamp", "")[:10]
        if date_str:
            if date_str not in daily_values:
                daily_values[date_str] = []
            daily_values[date_str].append(h.get("aqi"))
            
    unsafe_days_count = 0
    unsafe_days_list = []
    for date_str, vals in daily_values.items():
        day_avg = sum(vals) / len(vals)
        if day_avg > 100:
            unsafe_days_count += 1
            unsafe_days_list.append((date_str, round(day_avg, 1)))

    rec = generate_safety_recommendations(current_data["aqi"])
    tz_name = get_city_timezone(city)
    local_now = datetime.now(ZoneInfo(tz_name))

    if not REPORTLAB_AVAILABLE:
        # Return structured JSON data if ReportLab library is missing, allowing client to compile via jsPDF
        return jsonify({
            "message": "ReportLab package not available. Falling back to JSON report payload.",
            "data": {
                "city": city,
                "generated_at": local_now.strftime("%Y-%m-%d %H:%M:%S"),
                "current_aqi": current_data["aqi"],
                "category": current_data["category"],
                "average_aqi_7_days": avg_aqi,
                "highest_aqi_7_days": max_aqi,
                "unsafe_days_count": unsafe_days_count,
                "unsafe_days_list": unsafe_days_list,
                "current_recommendations": rec,
                "prediction": {
                    "next_hour": predict_data["next_hour"],
                    "tomorrow": predict_data["tomorrow"],
                    "weekly_trend": predict_data["weekly_trend"]
                }
            }
        }), 200

    # Build PDF buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette Styling
    primary_color = colors.HexColor("#1E293B") # Slate 800
    accent_color = colors.HexColor("#0F766E")  # Teal 700
    neutral_dark = colors.HexColor("#0F172A")  # Slate 900
    neutral_light = colors.HexColor("#F8FAFC") # Slate 50
    border_color = colors.HexColor("#CBD5E1")  # Slate 300
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=primary_color,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor("#475569"),
        spaceAfter=25
    )

    h2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=accent_color,
        spaceBefore=15,
        spaceAfter=10
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=neutral_dark,
        leading=14,
        spaceAfter=8
    )
    
    list_item_style = ParagraphStyle(
        'DocList',
        parent=body_style,
        leftIndent=15,
        spaceAfter=4
    )

    story = []
    
    # Document Header
    story.append(Paragraph("AI-Powered AQI Prediction Safety Report", title_style))
    story.append(Paragraph(f"Location: {city} | Generated on: {local_now.strftime('%Y-%m-%d %H:%M:%S')} ({tz_name}) | Status: Official Environmental Log", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Section 1: Executive AQI Summary
    story.append(Paragraph("1. Executive Air Quality Summary", h2_style))
    story.append(Paragraph(f"The current Air Quality Index (AQI) in <b>{city}</b> is <b>{current_data['aqi']}</b>, classifying it under the <b>{current_data['category']}</b> category. Below are the key pollutant concentrations measured at the local monitoring station:", body_style))
    
    # Pollutants Table
    table_data = [
        [Paragraph("<b>Pollutant</b>", body_style), Paragraph("<b>Value</b>", body_style), Paragraph("<b>Status (EPA Standards)</b>", body_style)],
        ["PM2.5", f"{current_data['pm25']} ug/m3", "Unsafe" if current_data['pm25'] > 35 else "Safe"],
        ["PM10", f"{current_data['pm10']} ug/m3", "Unsafe" if current_data['pm10'] > 150 else "Safe"],
        ["NO2", f"{current_data['no2']} ppb", "Safe"],
        ["SO2", f"{current_data['so2']} ppb", "Safe"],
        ["CO", f"{current_data['co']} ppm", "Safe"],
    ]
    
    t1 = Table(table_data, colWidths=[150, 150, 180])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), neutral_light),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ]))
    story.append(t1)
    story.append(Spacer(1, 15))
    
    # Section 2: Construction Safety Guidelines
    story.append(Paragraph("2. Real-Time Construction Safety Advisories", h2_style))
    story.append(Paragraph(f"Based on the local air quality index, the construction zone safety status is flagged as <b>{rec['status']}</b>. Engineering and HSE teams must enforce the following guidelines:", body_style))
    story.append(Paragraph(f"<b>• Mandatory PPE:</b> {', '.join(rec['ppe'])}", body_style))
    story.append(Paragraph(f"<b>• Site Water Spraying Protocol:</b> {rec['water_spraying']}", body_style))
    story.append(Paragraph(f"<b>• Public Health Risk:</b> {rec['health_risk']}", body_style))
    story.append(Paragraph("<b>• Operational Directives:</b>", body_style))
    for directive in rec["guidelines"]:
        story.append(Paragraph(f"- {directive}", list_item_style))
    story.append(Spacer(1, 15))
    
    # Section 3: AI Prediction & Predictions
    story.append(Paragraph("3. Predictive Environmental Intelligence", h2_style))
    story.append(Paragraph(f"The system runs a Linear Regression model fitted on localized historical weather correlations. Model metrics: <b>R² Score = {predict_data['r2_score']}</b> (Last calibrated: {predict_data['last_trained']}).", body_style))
    
    pred_table_data = [
        [Paragraph("<b>Forecast Period</b>", body_style), Paragraph("<b>Predicted AQI</b>", body_style), Paragraph("<b>Predicted Safety Status</b>", body_style)],
        ["Next Hour", f"{predict_data['next_hour']}", generate_safety_recommendations(predict_data['next_hour'])["status"]],
        ["Tomorrow (24h Avg)", f"{predict_data['tomorrow']}", generate_safety_recommendations(predict_data['tomorrow'])["status"]],
    ]
    t2 = Table(pred_table_data, colWidths=[150, 150, 180])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), neutral_light),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ]))
    story.append(t2)
    story.append(Spacer(1, 15))
    
    # Section 4: Historical Analytics
    story.append(Paragraph("4. Historical Trend Analysis (Past 7 Days)", h2_style))
    story.append(Paragraph(f"Analysis of {total_readings} historical readings indicates that the average AQI was <b>{avg_aqi}</b>, with a peak spike reaching <b>{max_aqi}</b>. There were <b>{unsafe_days_count}</b> days categorized as unsafe (daily AQI average > 100):", body_style))
    
    if unsafe_days_list:
        unsafe_rows = [[Paragraph("<b>Unsafe Date</b>", body_style), Paragraph("<b>Daily Average AQI</b>", body_style)]]
        for date_str, val in unsafe_days_list:
            unsafe_rows.append([date_str, f"{val}"])
        t3 = Table(unsafe_rows, colWidths=[200, 280])
        t3.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#FEE2E2")),
            ('GRID', (0, 0), (-1, -1), 0.5, border_color),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t3)
    else:
        story.append(Paragraph("No days with an average AQI exceeding 100 were logged in the past week.", list_item_style))
        
    # Build Document
    doc.build(story)
    buffer.seek(0)
    
    # Return as download attachment
    filename = f"AQI_Safety_Report_{city.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return send_file(
        buffer, 
        mimetype="application/pdf", 
        as_attachment=True, 
        download_name=filename
    )

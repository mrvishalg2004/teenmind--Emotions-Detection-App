import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

os.makedirs('docs/readme-assets/device-mockups', exist_ok=True)
os.makedirs('docs/readme-assets/generated-visuals', exist_ok=True)

FONT_PATH = '/System/Library/Fonts/HelveticaNeue.ttc'

def get_font(size, index=0):
    try:
        return ImageFont.truetype(FONT_PATH, size, index=index)
    except Exception:
        return ImageFont.load_default()

def draw_pill(draw, x, y, text, font, bg_color, text_color, px=16, py=7):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    w = tw + px * 2
    h = th + py * 2
    draw.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, fill=bg_color)
    draw.text((x + px, y + py), text, fill=text_color, font=font)
    return w, h

def draw_vector_arrow(draw, start_x, start_y, length=44, color=(167, 139, 250, 255)):
    # Draw line
    end_x = start_x + length
    draw.line([(start_x, start_y), (end_x, start_y)], fill=color, width=3)
    # Draw arrowhead
    head_size = 7
    draw.polygon([
        (end_x, start_y),
        (end_x - head_size, start_y - head_size),
        (end_x - head_size, start_y + head_size)
    ], fill=color)

def draw_brain_emblem(draw, x, y, size=54):
    # Rounded badge
    draw.rounded_rectangle([x, y, x + size, y + size], radius=16, fill=(107, 78, 255, 255), outline=(139, 92, 246, 255), width=2)
    # Stylized brain lobes inside
    cx, cy = x + size // 2, y + size // 2
    # Left hemisphere lobe
    draw.arc([cx - 16, cy - 14, cx - 2, cy + 2], start=100, end=320, fill=(255, 255, 255, 255), width=2)
    draw.arc([cx - 18, cy - 4, cx - 2, cy + 14], start=120, end=340, fill=(255, 255, 255, 255), width=2)
    # Right hemisphere lobe
    draw.arc([cx + 2, cy - 14, cx + 16, cy + 2], start=220, end=80, fill=(255, 255, 255, 255), width=2)
    draw.arc([cx + 2, cy - 4, cx + 18, cy + 14], start=200, end=60, fill=(255, 255, 255, 255), width=2)
    # Central synaptic line
    draw.line([(cx, cy - 14), (cx, cy + 14)], fill=(200, 190, 255, 255), width=2)
    # Synapse dots
    draw.ellipse([cx - 10, cy - 5, cx - 7, cy - 2], fill=(255, 255, 255, 255))
    draw.ellipse([cx + 7, cy - 5, cx + 10, cy - 2], fill=(255, 255, 255, 255))
    draw.ellipse([cx - 8, cy + 5, cx - 5, cy + 8], fill=(255, 255, 255, 255))
    draw.ellipse([cx + 5, cy + 5, cx + 8, cy + 8], fill=(255, 255, 255, 255))

def draw_phone_icon(draw, x, y, color=(79, 70, 229)):
    draw.rounded_rectangle([x, y, x + 20, y + 32], radius=4, outline=color, width=2)
    draw.line([(x + 7, y + 4), (x + 13, y + 4)], fill=color, width=1)
    draw.ellipse([x + 8.5, y + 25, x + 11.5, y + 28], fill=color)

def draw_network_icon(draw, x, y, color=(124, 58, 237)):
    # 3 interconnected nodes
    n1 = (x + 10, y + 5)
    n2 = (x + 4, y + 26)
    n3 = (x + 18, y + 24)
    draw.line([n1, n2], fill=color, width=2)
    draw.line([n1, n3], fill=color, width=2)
    draw.line([n2, n3], fill=color, width=2)
    for nx, ny in [n1, n2, n3]:
        draw.ellipse([nx - 4, ny - 4, nx + 4, ny + 4], fill=color)
        draw.ellipse([nx - 2, ny - 2, nx + 2, ny + 2], fill=(255, 255, 255))

def draw_shield_icon(draw, x, y, color=(16, 185, 129)):
    points = [
        (x + 11, y + 3),
        (x + 21, y + 7),
        (x + 18, y + 22),
        (x + 11, y + 29),
        (x + 4, y + 22),
        (x + 1, y + 7),
    ]
    draw.polygon(points, outline=color, fill=(236, 253, 245))
    draw.line([(x + 7, y + 15), (x + 10, y + 19), (x + 16, y + 11)], fill=color, width=2)

# ─── GENERATE PROJECT HERO BANNER ─────────────────────────────────────────────
def generate_project_hero(output_path, canvas_size=(1920, 640)):
    cw, ch = canvas_size
    img = Image.new('RGBA', (cw, ch), (13, 14, 23, 255))
    draw = ImageDraw.Draw(img)
    
    # Ambient radial lighting
    aura = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    adraw = ImageDraw.Draw(aura)
    for r in range(650, 100, -50):
        a = int(38 * (1 - r / 650))
        adraw.ellipse([140 - r, 300 - r, 140 + r, 300 + r], fill=(107, 78, 255, a))
    for r in range(550, 100, -50):
        a = int(32 * (1 - r / 550))
        adraw.ellipse([cw - 300 - r, 320 - r, cw - 300 + r, 320 + r], fill=(79, 70, 229, a))
    aura = aura.filter(ImageFilter.GaussianBlur(60))
    img.alpha_composite(aura)
    
    # Subtle geometric grid dots
    for x in range(60, cw - 60, 56):
        for y in range(40, ch - 40, 56):
            draw.ellipse([x, y, x + 2, y + 2], fill=(255, 255, 255, 8))
            
    # Connect subtle neural node lines on right
    neural_nodes = [
        (cw - 520, 220), (cw - 420, 160), (cw - 320, 210), (cw - 220, 150),
        (cw - 460, 340), (cw - 340, 320), (cw - 200, 310),
        (cw - 480, 470), (cw - 380, 460), (cw - 260, 450)
    ]
    for nx1, ny1 in neural_nodes:
        for nx2, ny2 in neural_nodes:
            dist = math.hypot(nx2 - nx1, ny2 - ny1)
            if 0 < dist < 170:
                draw.line([(nx1, ny1), (nx2, ny2)], fill=(107, 78, 255, 35), width=1)
                
    for nx, ny in neural_nodes:
        draw.ellipse([nx - 5, ny - 5, nx + 5, ny + 5], fill=(107, 78, 255, 140))
        draw.ellipse([nx - 2, ny - 2, nx + 2, ny + 2], fill=(255, 255, 255, 240))
        
    font_badge = get_font(13)
    font_hero_title = get_font(52)
    font_hero_sub = get_font(21)
    font_hero_desc = get_font(16)
    font_card_title = get_font(16)
    font_card_val = get_font(26)
    font_card_sub = get_font(13)
    font_tech = get_font(13)
    
    # Left Content Column
    lx = 100
    
    # Badge
    draw_pill(draw, lx, 70, "NEURAL NETWORK MENTAL HEALTH INTELLIGENCE", font_badge, (36, 28, 64), (167, 139, 250), px=14, py=6)
    
    # Vector Brain Emblem + Title
    draw_brain_emblem(draw, lx, 118, size=52)
    draw.text((lx + 68, 118), "TeenMind", fill=(255, 255, 255, 255), font=font_hero_title)
    
    # Subtitle
    draw.text((lx, 192), "AI-Powered Adolescent Mental Health & Wellness Platform", fill=(224, 217, 255, 255), font=font_hero_sub)
    
    # Description
    desc_lines = [
        "A full-stack mobile ecosystem empowering teenagers with proactive emotional self-awareness,",
        "Multilayer Perceptron (MLP) neural network risk prediction, and confidential peer support.",
        "Bridging adolescents, schools, and parents with real-time early warning wellness telemetry."
    ]
    for i, line in enumerate(desc_lines):
        draw.text((lx, 240 + i * 26), line, fill=(156, 163, 175, 255), font=font_hero_desc)
        
    # Tech Stack Badges
    tech_stack = [
        ("React Native", (34, 197, 94)),
        ("Expo SDK 54", (59, 130, 246)),
        ("FastAPI ML", (168, 85, 247)),
        ("PyTorch ANN", (239, 68, 68)),
        ("MongoDB Atlas", (16, 185, 129)),
        ("AES-256", (245, 158, 11))
    ]
    tx = lx
    ty = 346
    for label, col in tech_stack:
        w, h = draw_pill(draw, tx, ty, label, font_tech, (25, 28, 45), col, px=14, py=6)
        tx += w + 12
        
    # Feature Metrics Bar
    metrics = [
        ("6 Behavioral Vectors", "Stress · Anxiety · Sleep · Social · Academic · Emotional"),
        ("35 Training Epochs", "Trained on adolescent behavioral psychology dataset"),
        ("4-Tier Risk Engine", "Normal · Mild Stress · High Stress · Critical Intervention")
    ]
    mx = lx
    my = 430
    for mtitle, msub in metrics:
        draw.rounded_rectangle([mx, my, mx + 360, my + 95], radius=14, fill=(20, 22, 38, 220), outline=(45, 48, 70, 255), width=1)
        draw.text((mx + 18, my + 16), mtitle, fill=(255, 255, 255, 255), font=font_card_title)
        draw.text((mx + 18, my + 44), msub, fill=(156, 163, 175, 255), font=font_card_sub)
        mx += 380

    # Right Column: Holographic Telemetry Card
    card_x = cw - 580
    card_y = 80
    card_w = 480
    card_h = 480
    
    # Glass Card background
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=24, fill=(22, 24, 40, 230), outline=(75, 65, 120, 255), width=2)
    
    # Card Header
    draw.text((card_x + 28, card_y + 24), "LIVE WELLNESS TELEMETRY", fill=(167, 139, 250, 255), font=font_badge)
    draw.text((card_x + 28, card_y + 48), "Student Status Overview", fill=(255, 255, 255, 255), font=font_card_title)
    
    # Score Dial / Stat Box
    draw.rounded_rectangle([card_x + 28, card_y + 88, card_x + card_w - 28, card_y + 175], radius=16, fill=(30, 32, 54, 255), outline=(55, 58, 85, 255), width=1)
    draw.text((card_x + 48, card_y + 102), "76 / 100", fill=(34, 197, 94, 255), font=font_card_val)
    draw.text((card_x + 48, card_y + 140), "Overall Mental Health Score (Good Standing)", fill=(156, 163, 175, 255), font=font_card_sub)
    draw_pill(draw, card_x + card_w - 145, card_y + 115, "LOW RISK", font_badge, (20, 83, 45), (74, 222, 128), px=12, py=5)
    
    # 6 Vectors Progress Bars
    vectors = [
        ("Stress Level", 0.28, "2.8/5 · Low"),
        ("Anxiety Vector", 0.26, "2.6/5 · Managed"),
        ("Sleep Quality", 0.75, "7.8 hrs · Restful"),
        ("Social Connection", 0.80, "Active Peer Circle"),
        ("Academic Pressure", 0.45, "Moderate Workload"),
        ("Emotional Stability", 0.85, "High Resilience")
    ]
    vy = card_y + 195
    for vname, vval, vlabel in vectors:
        draw.text((card_x + 28, vy), vname, fill=(209, 213, 219, 255), font=font_card_sub)
        draw.text((card_x + card_w - 170, vy), vlabel, fill=(156, 163, 175, 255), font=font_card_sub)
        # Track
        draw.rounded_rectangle([card_x + 28, vy + 20, card_x + card_w - 28, vy + 26], radius=3, fill=(40, 44, 70, 255))
        # Fill
        fill_w = int((card_w - 56) * vval)
        fill_col = (107, 78, 255) if vval < 0.6 else (34, 197, 94)
        draw.rounded_rectangle([card_x + 28, vy + 20, card_x + 28 + fill_w, vy + 26], radius=3, fill=fill_col)
        vy += 42
        
    img.convert('RGB').save(output_path, 'PNG', quality=95)
    print(f'✅ Generated Hero Banner: {output_path}')

# ─── GENERATE SUPPORTING ARCHITECTURE ILLUSTRATION ────────────────────────────
def generate_supporting_illustration(output_path, canvas_size=(1600, 960)):
    cw, ch = canvas_size
    img = Image.new('RGBA', (cw, ch), (247, 246, 252, 255))
    draw = ImageDraw.Draw(img)
    
    # Background soft aura
    aura = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    adraw = ImageDraw.Draw(aura)
    for r in range(700, 100, -60):
        a = int(16 * (1 - r / 700))
        adraw.ellipse([cw // 2 - r, ch // 2 - int(r * 0.7), cw // 2 + r, ch // 2 + int(r * 0.7)], fill=(107, 78, 255, a))
    aura = aura.filter(ImageFilter.GaussianBlur(50))
    img.alpha_composite(aura)
    
    font_badge = get_font(13)
    font_title = get_font(38)
    font_sub = get_font(17)
    font_col_title = get_font(21)
    font_item_title = get_font(15)
    font_item_desc = get_font(13)
    
    # Header
    draw_pill(draw, cw // 2 - 130, 45, "INTEGRATED HEALTH ARCHITECTURE", font_badge, (238, 234, 255), (107, 78, 255))
    
    title = "TeenMind Predictive Mental Health & Care Pipeline"
    t_bbox = draw.textbbox((0, 0), title, font=font_title)
    draw.text(((cw - (t_bbox[2] - t_bbox[0])) // 2, 85), title, fill=(26, 26, 46, 255), font=font_title)
    
    sub = "End-to-end telemetry loop bridging daily student wellness logging, neural network inference, and parental care"
    s_bbox = draw.textbbox((0, 0), sub, font=font_sub)
    draw.text(((cw - (s_bbox[2] - s_bbox[0])) // 2, 135), sub, fill=(107, 114, 128, 255), font=font_sub)
    
    # 3 Columns Architecture
    col_w = 440
    col_gap = 48
    start_x = (cw - (col_w * 3 + col_gap * 2)) // 2
    col_y = 195
    col_h = 670
    
    columns_data = [
        {
            "tag": "INPUT TELEMETRY",
            "tag_bg": (238, 242, 255),
            "tag_col": (79, 70, 229),
            "title": "Student Mobile App",
            "type": "phone",
            "border": (220, 225, 245),
            "items": [
                ("Daily Mood Tracking", "10 granular emotion vectors (happy, anxious, overwhelmed, etc.) with intensity 1–10 and triggers."),
                ("Confidential Journaling", "Client-side encrypted reflections with automated sentiment polarity and theme analysis."),
                ("AI MindBot Companion", "On-demand cognitive restructuring, 5-5-5 breathing resets, and grounding exercises."),
                ("Clinical Assessments", "15-factor standardized screening evaluating sleep, stress, and academic pressure.")
            ]
        },
        {
            "tag": "INTELLIGENCE ENGINE",
            "tag_bg": (245, 243, 255),
            "tag_col": (124, 58, 237),
            "title": "MLP Neural Network",
            "type": "network",
            "border": (205, 195, 245),
            "items": [
                ("6D Feature Vector Engine", "Mathematical mapping of stress, anxiety, sleep, social, academic, and emotional parameters."),
                ("35-Epoch Trained ANN", "Trained with backpropagation to detect non-linear behavioral correlations without overfitting."),
                ("4-Class Risk Classification", "Maps student status to Normal, Mild Stress, High Stress, or Critical Depression Risk."),
                ("Confidence & Reliability Score", "F1-optimized inference minimizing false negatives for adolescent safety.")
            ]
        },
        {
            "tag": "PROACTIVE INTERVENTION",
            "tag_bg": (236, 253, 245),
            "tag_col": (16, 185, 129),
            "title": "Parent & Crisis Network",
            "type": "shield",
            "border": (195, 235, 220),
            "items": [
                ("Parent Wellness Portal", "Longitudinal mood trajectory bars, dominant emotional patterns, and monthly trend reports."),
                ("Early Warning Alerts", "Automated push & email alerts dispatched when risk thresholds elevate beyond safety buffers."),
                ("Consent & Privacy Barrier", "Students retain journal confidentiality while parents receive high-level wellness summaries."),
                ("Integrated Crisis Bridge", "One-tap direct lifeline routing to 988 Suicide & Crisis Lifeline and local emergency contacts.")
            ]
        }
    ]
    
    for c_idx, col in enumerate(columns_data):
        cx = start_x + c_idx * (col_w + col_gap)
        
        # Column card
        draw.rounded_rectangle([cx, col_y, cx + col_w, col_y + col_h], radius=22, fill=(255, 255, 255, 250), outline=col["border"], width=2)
        
        # Column top badge
        draw_pill(draw, cx + 28, col_y + 24, col["tag"], font_badge, col["tag_bg"], col["tag_col"])
        
        # Draw vector icon
        icon_x = cx + 28
        icon_y = col_y + 60
        if col["type"] == "phone":
            draw_phone_icon(draw, icon_x, icon_y, col["tag_col"])
        elif col["type"] == "network":
            draw_network_icon(draw, icon_x, icon_y, col["tag_col"])
        elif col["type"] == "shield":
            draw_shield_icon(draw, icon_x, icon_y, col["tag_col"])
            
        draw.text((icon_x + 32, icon_y + 4), col["title"], fill=(26, 26, 46, 255), font=font_col_title)
        
        # Card items
        iy = col_y + 115
        for ititle, idesc in col["items"]:
            draw.rounded_rectangle([cx + 20, iy, cx + col_w - 20, iy + 115], radius=14, fill=(249, 250, 253, 255), outline=(235, 238, 245, 255), width=1)
            # Accent pill
            draw.rounded_rectangle([cx + 20, iy + 14, cx + 24, iy + 36], radius=2, fill=col["tag_col"])
            draw.text((cx + 34, iy + 14), ititle, fill=(31, 41, 55, 255), font=font_item_title)
            
            # Word wrap
            words = idesc.split()
            lines = []
            curr_line = ""
            for w in words:
                test_line = f"{curr_line} {w}".strip()
                tb = draw.textbbox((0, 0), test_line, font=font_item_desc)
                if tb[2] - tb[0] < col_w - 68:
                    curr_line = test_line
                else:
                    lines.append(curr_line)
                    curr_line = w
            if curr_line:
                lines.append(curr_line)
                
            for l_idx, l in enumerate(lines[:3]):
                draw.text((cx + 34, iy + 42 + l_idx * 20), l, fill=(107, 114, 128, 255), font=font_item_desc)
                
            iy += 130

    # Draw connecting flow arrows between columns
    arrow1_x = start_x + col_w + 3
    arrow2_x = start_x + col_w * 2 + col_gap + 3
    draw_vector_arrow(draw, arrow1_x, col_y + col_h // 2 - 10, length=42, color=(167, 139, 250, 255))
    draw_vector_arrow(draw, arrow2_x, col_y + col_h // 2 - 10, length=42, color=(167, 139, 250, 255))
    
    img.convert('RGB').save(output_path, 'PNG', quality=95)
    print(f'✅ Generated Supporting Illustration: {output_path}')

if __name__ == '__main__':
    generate_project_hero('docs/readme-assets/generated-visuals/project-hero.png')
    generate_supporting_illustration('docs/readme-assets/generated-visuals/supporting-illustration.png')

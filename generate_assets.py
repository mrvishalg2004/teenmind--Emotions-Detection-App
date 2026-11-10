import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Ensure directories exist
os.makedirs('docs/readme-assets/device-mockups', exist_ok=True)
os.makedirs('docs/readme-assets/generated-visuals', exist_ok=True)

FONT_PATH = '/System/Library/Fonts/HelveticaNeue.ttc'

def get_font(size, index=0):
    try:
        return ImageFont.truetype(FONT_PATH, size, index=index)
    except Exception:
        return ImageFont.load_default()

def create_phone_element(screenshot_path, target_height=820):
    """Render a realistic modern smartphone frame around the screenshot."""
    screen = Image.open(screenshot_path).convert('RGBA')
    sw, sh = screen.size
    
    # Scale screenshot to target height
    target_width = int(sw * (target_height / sh))
    screen_resized = screen.resize((target_width, target_height), Image.Resampling.LANCZOS)
    
    bezel = 14
    side_button_w = 4
    phone_w = target_width + bezel * 2
    phone_h = target_height + bezel * 2
    
    corner_radius = 44
    screen_radius = 32
    
    # Total phone canvas including buttons and shadow space
    canvas_w = phone_w + 80
    canvas_h = phone_h + 90
    phone_img = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    
    # Shadow layer
    shadow_img = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_img)
    ox, oy = 40, 30
    
    # Multi-layer soft realistic drop shadow
    # Ambient purple glow
    sdraw.rounded_rectangle(
        [ox - 2, oy + 18, ox + phone_w + 2, oy + phone_h + 30],
        radius=corner_radius + 6,
        fill=(107, 78, 255, 38)
    )
    # Deep contact shadow
    sdraw.rounded_rectangle(
        [ox + 4, oy + 12, ox + phone_w - 4, oy + phone_h + 16],
        radius=corner_radius + 2,
        fill=(18, 16, 38, 70)
    )
    shadow_blurred = shadow_img.filter(ImageFilter.GaussianBlur(22))
    phone_img.alpha_composite(shadow_blurred)
    
    # Phone body
    body_img = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(body_img)
    
    # Side buttons
    # Power button on right
    bdraw.rounded_rectangle([ox + phone_w - 1, oy + 160, ox + phone_w + 3, oy + 230], radius=2, fill=(45, 45, 55, 255))
    # Volume buttons on left
    bdraw.rounded_rectangle([ox - 3, oy + 130, ox + 1, oy + 185], radius=2, fill=(45, 45, 55, 255))
    bdraw.rounded_rectangle([ox - 3, oy + 200, ox + 1, oy + 255], radius=2, fill=(45, 45, 55, 255))
    
    # Outer frame with dark metallic finish
    bdraw.rounded_rectangle(
        [ox, oy, ox + phone_w, oy + phone_h],
        radius=corner_radius,
        fill=(24, 25, 30, 255),
        outline=(65, 68, 78, 255),
        width=2
    )
    # Inner bezel line
    bdraw.rounded_rectangle(
        [ox + 2, oy + 2, ox + phone_w - 2, oy + phone_h - 2],
        radius=corner_radius - 2,
        outline=(14, 14, 18, 255),
        width=2
    )
    
    # Screen mask
    screen_mask = Image.new('L', (target_width, target_height), 0)
    mdraw = ImageDraw.Draw(screen_mask)
    mdraw.rounded_rectangle([0, 0, target_width - 1, target_height - 1], radius=screen_radius, fill=255)
    
    # Screen placement
    body_img.paste(screen_resized, (ox + bezel, oy + bezel), screen_mask)
    
    # Dynamic Island pill
    island_w, island_h = 88, 22
    island_x = ox + (phone_w - island_w) // 2
    island_y = oy + bezel + 7
    bdraw.rounded_rectangle(
        [island_x, island_y, island_x + island_w, island_y + island_h],
        radius=11,
        fill=(8, 8, 12, 255)
    )
    # Front camera lens
    lens_x = island_x + island_w - 16
    lens_y = island_y + 6
    bdraw.ellipse([lens_x, lens_y, lens_x + 9, lens_y + 9], fill=(22, 28, 42, 255))
    bdraw.ellipse([lens_x + 2, lens_y + 2, lens_x + 6, lens_y + 6], fill=(55, 75, 120, 255))
    
    # Home bar
    bar_w, bar_h = 100, 4
    bar_x = ox + (phone_w - bar_w) // 2
    bar_y = oy + phone_h - bezel - 9
    bdraw.rounded_rectangle(
        [bar_x, bar_y, bar_x + bar_w, bar_y + bar_h],
        radius=2,
        fill=(190, 195, 210, 180)
    )
    
    phone_img.alpha_composite(body_img)
    return phone_img, canvas_w, canvas_h

def draw_pill_badge(draw, x, y, text, font, bg_color=(238, 234, 255), text_color=(107, 78, 255)):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    px, py = 16, 7
    w = tw + px * 2
    h = th + py * 2
    bx = x - w // 2
    draw.rounded_rectangle([bx, y, bx + w, y + h], radius=h // 2, fill=bg_color)
    draw.text((bx + px, y + py), text, fill=text_color, font=font)
    return h

def generate_single_mockup(screenshot_path, output_path, badge, title, subtitle, footer_tags, canvas_size=(1920, 1140)):
    cw, ch = canvas_size
    canvas = Image.new('RGBA', (cw, ch), (248, 247, 253, 255))
    draw = ImageDraw.Draw(canvas)
    
    # Ambient background gradient / soft glow
    aura = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    adraw = ImageDraw.Draw(aura)
    cx, cy = cw // 2, ch // 2 + 60
    for r in range(650, 100, -50):
        alpha = int(18 * (1 - r / 650))
        adraw.ellipse([cx - r, cy - int(r * 0.7), cx + r, cy + int(r * 0.7)], fill=(107, 78, 255, alpha))
    aura = aura.filter(ImageFilter.GaussianBlur(40))
    canvas.alpha_composite(aura)
    
    # Create Phone
    phone_img, pw, ph = create_phone_element(screenshot_path, target_height=800)
    
    # Header Typography
    font_badge = get_font(13)
    font_title = get_font(38)
    font_sub = get_font(18)
    font_tag = get_font(15)
    
    badge_h = draw_pill_badge(draw, cw // 2, 45, badge, font_badge)
    
    t_bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = t_bbox[2] - t_bbox[0]
    draw.text(((cw - tw) // 2, 85), title, fill=(26, 26, 46, 255), font=font_title)
    
    s_bbox = draw.textbbox((0, 0), subtitle, font=font_sub)
    sw = s_bbox[2] - s_bbox[0]
    draw.text(((cw - sw) // 2, 135), subtitle, fill=(107, 114, 128, 255), font=font_sub)
    
    # Center phone
    px = (cw - pw) // 2
    py = 180
    canvas.alpha_composite(phone_img, (px, py))
    
    # Footer Feature Badges
    tags_str = "   ·   ".join(footer_tags)
    tags_bbox = draw.textbbox((0, 0), tags_str, font=font_tag)
    tags_w = tags_bbox[2] - tags_bbox[0]
    
    footer_y = ch - 50
    # Footer pill container
    f_box_w = tags_w + 36
    f_box_h = 32
    f_bx = (cw - f_box_w) // 2
    draw.rounded_rectangle([f_bx, footer_y - 6, f_bx + f_box_w, footer_y - 6 + f_box_h], radius=16, fill=(255, 255, 255, 220), outline=(230, 225, 245, 255), width=1)
    draw.text(((cw - tags_w) // 2, footer_y), tags_str, fill=(75, 85, 99, 255), font=font_tag)
    
    canvas.convert('RGB').save(output_path, 'PNG', quality=95)
    print(f'✅ Generated: {output_path}')

def generate_showcase(output_path, canvas_size=(2400, 1380)):
    cw, ch = canvas_size
    canvas = Image.new('RGBA', (cw, ch), (247, 246, 252, 255))
    draw = ImageDraw.Draw(canvas)
    
    # Ambient background aura
    aura = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    adraw = ImageDraw.Draw(aura)
    cx, cy = cw // 2, ch // 2 + 100
    for r in range(950, 150, -70):
        alpha = int(22 * (1 - r / 950))
        adraw.ellipse([cx - r, cy - int(r * 0.65), cx + r, cy + int(r * 0.65)], fill=(107, 78, 255, alpha))
    aura = aura.filter(ImageFilter.GaussianBlur(50))
    canvas.alpha_composite(aura)
    
    # Header
    font_badge = get_font(15)
    font_title = get_font(46)
    font_sub = get_font(21)
    font_tag = get_font(16)
    
    draw_pill_badge(draw, cw // 2, 45, "TEENMIND COMPLETE MOBILE SUITE", font_badge)
    
    title = "AI-Powered Adolescent Mental Health & Wellness Platform"
    t_bbox = draw.textbbox((0, 0), title, font=font_title)
    draw.text(((cw - (t_bbox[2] - t_bbox[0])) // 2, 92), title, fill=(26, 26, 46, 255), font=font_title)
    
    sub = "Real-time behavioral telemetry, ANN risk prediction, confidential journaling, and proactive parental support"
    s_bbox = draw.textbbox((0, 0), sub, font=font_sub)
    draw.text(((cw - (s_bbox[2] - s_bbox[0])) // 2, 150), sub, fill=(107, 114, 128, 255), font=font_sub)
    
    # Phones:
    # Left phone: Mood Tracker (target_height 770)
    phone_left, plw, plh = create_phone_element('docs/readme-assets/mobile-screenshots/04-mood-tracker-screen.png', target_height=770)
    # Right phone: Chatbot (target_height 770)
    phone_right, prw, prh = create_phone_element('docs/readme-assets/mobile-screenshots/06-chatbot-screen.png', target_height=770)
    # Center phone: Student Dashboard (target_height 840, elevated)
    phone_center, pcw, pch = create_phone_element('docs/readme-assets/mobile-screenshots/03-dashboard-screen.png', target_height=840)
    
    # Placement
    center_x = (cw - pcw) // 2
    center_y = 205
    
    left_x = center_x - 390
    left_y = 245
    
    right_x = center_x + 390
    right_y = 245
    
    # Composite left and right first (behind center)
    canvas.alpha_composite(phone_left, (left_x, left_y))
    canvas.alpha_composite(phone_right, (right_x, right_y))
    
    # Composite center phone on top
    canvas.alpha_composite(phone_center, (center_x, center_y))
    
    # Labels under each phone
    font_label = get_font(17)
    font_label_sub = get_font(13)
    
    devices_info = [
        (left_x + plw // 2, ch - 120, "Daily Mood Tracker", "10 Emotions · Triggers · Activities"),
        (center_x + pcw // 2, ch - 85, "Student Dashboard", "ANN Mental Health Score: 76/100 (Good)"),
        (right_x + prw // 2, ch - 120, "MindBot AI Companion", "OpenRouter AI · Supportive Coping"),
    ]
    
    for lx, ly, ltitle, lsub in devices_info:
        tb = draw.textbbox((0, 0), ltitle, font=font_label)
        draw.text((lx - (tb[2] - tb[0]) // 2, ly), ltitle, fill=(31, 41, 55, 255), font=font_label)
        sb = draw.textbbox((0, 0), lsub, font=font_label_sub)
        draw.text((lx - (sb[2] - sb[0]) // 2, ly + 22), lsub, fill=(107, 114, 128, 255), font=font_label_sub)
        
    canvas.convert('RGB').save(output_path, 'PNG', quality=95)
    print(f'✅ Generated: {output_path}')

if __name__ == '__main__':
    print('Generating device mockups...')
    generate_single_mockup(
        'docs/readme-assets/mobile-screenshots/01-login-screen.png',
        'docs/readme-assets/device-mockups/login-device-mockup.png',
        'TEENMIND AUTHENTICATION',
        'Secure Mobile Authentication Experience',
        'Role-Based Student & Parent Access with End-to-End Encryption',
        ['🔐 AES-256 Encrypted', '⚡ Instant JWT Session Management', '🆘 24/7 Crisis Helpline Integration']
    )
    
    generate_single_mockup(
        'docs/readme-assets/mobile-screenshots/03-dashboard-screen.png',
        'docs/readme-assets/device-mockups/dashboard-device-mockup.png',
        'WELLNESS TELEMETRY',
        'Student Mental Health Dashboard',
        'Real-time Multilayer Perceptron (MLP) AI Assessment & Daily Mood Monitoring',
        ['🧠 ANN Machine Learning Scoring', '💭 Daily Mood Check-In', '📝 Confidential Journaling']
    )
    
    generate_showcase('docs/readme-assets/device-mockups/application-showcase.png')


# --- ui_elements.py (FINAL, PIXEL-PERFECT IMPLEMENTATION) ---

import pygame
import os

# Define the base directory of the script file for robust path handling
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) 

# 0.1 COLOUR PALETTE (GLOBAL)
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600

WHITE = (255, 255, 255)             # #FFFFFF - Primary Background
BLACK = (0, 0, 0)                   # #000000 - Primary Text Colour
GREY_SUBTITLE = (79, 79, 79)        # #4F4F4F - Grey Subtitle/Soft Label
ACCENT_BLUE = (26, 115, 232)        # #1A73E8 - Accent Blue
FEEDBACK_BG_GREY = (246, 246, 246)  # #F6F6F6 - "Hmmm..." Speech Bubble BG
DEEP_GREY_OUTLINE = (35, 35, 35)    # #232323 - "Hmmm..." Speech Bubble Border

# Legacy/Utility Constants
DARK_TEXT = BLACK
BRANDING_BLUE = ACCENT_BLUE

# Global Asset Variables (must be loaded via load_assets)
LOGO_ASSET = None 
MAIN_FONT = None        # Body Text (400, 18px)
SUBTITLE_FONT = None    # Subtitle (400, 18px)
HEADER_SUB_FONT = None  # Header Subtitle (16px)
HEADER_FONT = None      # Main Title (700, 32px)
TITLE_FONT = None       # App Name (700, 36px)
BUTTON_FONT = None      # Button Text (600, 20px)
LANGUAGE_FONT = None    # Language List (400, 14px)


# Asset Loading

def load_assets():
    global LOGO_ASSET
    global MAIN_FONT, SUBTITLE_FONT, HEADER_FONT, TITLE_FONT, BUTTON_FONT, LANGUAGE_FONT, HEADER_SUB_FONT
    
    # Initialize Fonts FIRST
    try:
        pygame.font.init()
        # 0.2 Typography Mapping
        MAIN_FONT = pygame.font.SysFont('Arial', 18)        
        SUBTITLE_FONT = pygame.font.SysFont('Arial', 18)    
        HEADER_FONT = pygame.font.SysFont('Arial', 32, bold=True) 
        TITLE_FONT = pygame.font.SysFont('Arial', 36, bold=True)  
        BUTTON_FONT = pygame.font.SysFont('Arial', 20, bold=True)
        LANGUAGE_FONT = pygame.font.SysFont('Arial', 14)    
        HEADER_SUB_FONT = pygame.font.SysFont('Arial', 16) 
        
    except Exception as e:
        print(f"FATAL: Failed to initialize fonts: {e}")
        
    # Image Loading
    ASSET_DIR = os.path.join(BASE_DIR, 'assets') 
    IMAGE_DIR = os.path.join(ASSET_DIR, 'images')
    
    try:
        RAW_LOGO_IMAGE = pygame.image.load(os.path.join(IMAGE_DIR, 'colour_grid_bg.png')).convert_alpha()
        LOGO_ASSET = pygame.transform.scale(RAW_LOGO_IMAGE, (60, 60)) 
        
    except pygame.error as e:
        print(f"Error loading logo asset: {e}")


# Text Rendering Utility Functions

def render_text(surface, text, font, colour, center_x=None, center_y=None, top_y=None, left_x=None):
    """Utility to render text with various positioning options."""
    if font is None:
        return pygame.Rect(0, 0, 0, 0)

    text_surface = font.render(text, True, colour)
    text_rect = text_surface.get_rect()
    
    if center_x is not None:
        text_rect.centerx = center_x
    elif left_x is not None:
        text_rect.left = left_x
    
    if center_y is not None:
        text_rect.centery = center_y
    elif top_y is not None:
        text_rect.top = top_y
        
    surface.blit(text_surface, text_rect)
    return text_rect

# Function to draw multiline text with word wrapping and padding
def draw_multiline_text(surface, text, font, color, rect, line_height):
    # FIX 3: Strip the input text to prevent accidental spacing overflow
    words = text.strip().split(" ")
    lines = []
    current_line = ""

    # Calculate max width for wrapping, accounting for inner padding (12px left/right)
    max_width = rect.width - 24 

    for word in words:
        test_line = current_line + word + " "
        if font.size(test_line)[0] <= max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word + " "
    lines.append(current_line)

    y = rect.top + 12 # 12px top padding
    for line in lines:
        line_surface = font.render(line.strip(), True, color) # Strip space from end of line
        surface.blit(line_surface, (rect.left + 12, y)) # 12px left padding
        y += line_height
    return y


# Language Grid Function
def draw_language_grid(screen):
    languages = [
        ""
    ]

    left_margin = 24 
    top_y = SCREEN_HEIGHT // 2 - 30
    col_count = 5 
    col_width = (SCREEN_WIDTH - 2 * left_margin) // col_count
    line_height = 26 

    for i, lang in enumerate(languages):
        col = i % col_count
        row = i // col_count

        x = left_margin + col * col_width
        y = top_y + row * line_height

        render_text(screen, lang, LANGUAGE_FONT, BLACK, left_x=x, top_y=y)


class TextInputBox:
    
    def __init__(self, x, y, width, height, font, color, max_length=50):
        self.rect = pygame.Rect(x, y, width, height)
        self.font = font
        self.color = color
        self.text = ''
        self.max_length = max_length
        self.active = False 

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            if self.rect.collidepoint(event.pos):
                self.active = not self.active
            else:
                self.active = False
            self.color = ACCENT_BLUE if self.active else BLACK 
            
        if event.type == pygame.KEYDOWN and self.active:
            if event.key == pygame.K_RETURN:
                return True 
            elif event.key == pygame.K_BACKSPACE:
                self.text = self.text[:-1]
            else:
                if len(self.text) < self.max_length:
                    self.text += event.unicode
        return False

    def draw(self, screen):
        pygame.draw.rect(screen, self.color, self.rect, 2) 
        
        if self.font: 
            text_surface = self.font.render(self.text, True, BLACK) 
            screen.blit(text_surface, (self.rect.x + 8, self.rect.y + 8))
            
            if self.active:
                cursor_pos = self.rect.x + 8 + text_surface.get_width()
                pygame.draw.line(screen, BLACK, (cursor_pos, self.rect.y + 8), 
                                 (cursor_pos, self.rect.y + self.rect.height - 8), 2)


# 1. SLIDE 1 — INTRO SCREEN

def draw_title_screen(screen):
    
    current_y = 80
    
    # 1.2 App Name Block
    if LOGO_ASSET:
        logo_rect = LOGO_ASSET.get_rect()
        logo_rect.centerx = SCREEN_WIDTH // 2
        logo_rect.top = current_y
        screen.blit(LOGO_ASSET, logo_rect)
        current_y = logo_rect.bottom + 16 
        
    # Draw [NAME]
    title_rect = render_text(
        screen, 
        "[NAME]", 
        TITLE_FONT, 
        BLACK, 
        center_x=SCREEN_WIDTH // 2, 
        top_y=current_y
    )
    current_y = title_rect.bottom + 16 

    # Draw [Game Motto/Mantra]
    motto_rect = render_text(
        screen, 
        "[Game Motto / Mantra]", 
        SUBTITLE_FONT, 
        GREY_SUBTITLE, 
        center_x=SCREEN_WIDTH // 2, 
        top_y=current_y
    )
    current_y = motto_rect.bottom + 40 

    # 1.3 “Play” Button
    button_width = int(SCREEN_WIDTH * 0.6)
    button_height = 60 
    play_button_x = SCREEN_WIDTH // 2 - button_width // 2
    play_button_y = current_y
    
    play_rect_bg = pygame.Rect(play_button_x, play_button_y, button_width, button_height)
    pygame.draw.rect(screen, ACCENT_BLUE, play_rect_bg, border_radius=12) 
    
    render_text(
        screen, 
        "Play", 
        BUTTON_FONT, 
        WHITE, 
        center_x=SCREEN_WIDTH // 2, 
        center_y=play_button_y + button_height // 2
    )
    current_y = play_rect_bg.bottom + 16 

    # 1.4 Date Line
    render_text(
        screen, 
        "[Date]", 
        MAIN_FONT, 
        GREY_SUBTITLE, 
        center_x=SCREEN_WIDTH // 2, 
        top_y=current_y
    )
    
    # 1.5 Language Grid 
    draw_language_grid(screen)
    
    return play_rect_bg


# 2. SLIDE 2 — FIRST QUESTION STATE

def draw_question_screen(screen, challenge_data, current_part_index, input_boxes):
    
    current_part = challenge_data['parts'][current_part_index]
    left_margin = 24 
    
    # 2.1 Header: “1/1 First Look” (16px, #4F4F4F)
    header_text = f"1/1 {challenge_data['full_challenge_header']}"
    header_rect = render_text(screen, header_text, HEADER_SUB_FONT, GREY_SUBTITLE, left_x=left_margin, top_y=24) 
    
    # 2.2 Main Title Area
    # FIX 1: Use only the part_header here to avoid showing "First Look" twice.
    title_text = current_part['part_header'] 
    title_rect = render_text(screen, title_text, HEADER_FONT, BLACK, left_x=left_margin, top_y=header_rect.bottom + 16)

    # 2.3 “Today’s Question” Block (Label)
    question_label_rect = render_text(
        screen, 
        "[Today's Question]", 
        MAIN_FONT, 
        GREY_SUBTITLE, 
        left_x=left_margin, 
        top_y=title_rect.bottom + 24
    )
    
    # Question text (16-18px, #000000)
    question_text = f"{current_part['part_header']}: {current_part['question']}"
    
    # Use multiline text for the question body
    question_rect = pygame.Rect(left_margin, question_label_rect.bottom + 8, SCREEN_WIDTH - 2 * left_margin, 100)
    final_y_after_question = draw_multiline_text(screen, question_text, MAIN_FONT, BLACK, question_rect, MAIN_FONT.get_height() + 4)
    
    # Input Box setup
    y_start = final_y_after_question + 32 
    
    box_label_width = 32 
    input_box_x = left_margin + box_label_width
    box_width = SCREEN_WIDTH - input_box_x - left_margin 
    box_height = 40
        
    for i, box in enumerate(input_boxes):
        # Update box position: shifted right by the label width
        box.rect.x = input_box_x 
        box.rect.y = y_start + i * (box_height + 16) 
        box.rect.width = box_width 

        # Draw the number label (1., 2., 3., etc.) 
        render_text(
            screen, 
            f"{i + 1}.", 
            MAIN_FONT, 
            BLACK, 
            left_x=left_margin, 
            center_y=box.rect.centery
        )
        # Draw the actual input box
        box.draw(screen)
        
    # 4. Draw Action Buttons (Hint and Lock In) - Positioned at the bottom
    
    button_y = SCREEN_HEIGHT - 48 
    
    # Button Sizing
    lock_in_width = 150
    lock_in_height = 50
    button_spacing = 16 

    # Symmetrical alignment
    lock_in_x_center = SCREEN_WIDTH // 2 + (lock_in_width / 2) + (button_spacing / 2)
    lock_in_rect = pygame.Rect(lock_in_x_center - lock_in_width // 2, button_y - lock_in_height // 2, lock_in_width, lock_in_height)
    pygame.draw.rect(screen, ACCENT_BLUE, lock_in_rect, border_radius=8)
    
    render_text(
        screen, 
        "Lock In", 
        BUTTON_FONT, 
        WHITE, 
        center_x=lock_in_rect.centerx, 
        center_y=lock_in_rect.centery
    )

    # Hint Button (Outlined variant)
    hint_width = 120 
    hint_x_center = SCREEN_WIDTH // 2 - (hint_width / 2) - (button_spacing / 2)
    hint_rect = pygame.Rect(hint_x_center - hint_width // 2, button_y - lock_in_height // 2, hint_width, lock_in_height)
    pygame.draw.rect(screen, ACCENT_BLUE, hint_rect, 2, border_radius=8) 

    render_text(
        screen, 
        "Hint", 
        BUTTON_FONT, 
        ACCENT_BLUE, 
        center_x=hint_rect.centerx,
        center_y=hint_rect.centery
    )
    
    return lock_in_rect, hint_rect


# 2.4 / 2.5 — Feedback Screen Drawing 
def draw_feedback_screen(screen, feedback_data):
    
    # 1. Draw "Hmmm ..." (Top one)
    top_y_start = 24
    # FIX 2: Consistent use of "Hmmm ..."
    hmmm1_rect = render_text(screen, "Hmmm ...", MAIN_FONT, BLACK, center_x=SCREEN_WIDTH // 2, top_y=top_y_start) 
    
    # 2. Draw the Speech Bubble (Custom Response)
    general_message = feedback_data.get('general_message', "Processing complete.")
    
    box_width = SCREEN_WIDTH * 0.8
    box_x = SCREEN_WIDTH // 2 - box_width // 2
    box_y = hmmm1_rect.bottom + 8 # 8px spacing
    
    # Calculate final height: 24px vertical padding + line count * line height
    line_height_fixed = MAIN_FONT.get_height() + 4
    
    # Estimate line count for the bubble (using the stripped logic)
    words = general_message.strip().split(" ")
    line_count = 1
    current_line = ""
    temp_rect = pygame.Rect(0, 0, box_width - 24, 10) 

    for word in words:
        test_line = current_line + word + " "
        if MAIN_FONT.size(test_line)[0] <= temp_rect.width:
            current_line = test_line
        else:
            line_count += 1
            current_line = word + " "
    box_height = max(50, line_count * line_height_fixed + 24) 
    
    bubble_rect = pygame.Rect(box_x, box_y, box_width, box_height)
    
    # Draw bubble background and border
    pygame.draw.rect(screen, FEEDBACK_BG_GREY, bubble_rect, border_radius=8)
    pygame.draw.rect(screen, DEEP_GREY_OUTLINE, bubble_rect, 1, border_radius=8)
    
    # Draw general message text inside the box
    draw_multiline_text(
        screen, 
        general_message, 
        MAIN_FONT, 
        BLACK, 
        bubble_rect, 
        line_height_fixed
    )

    # 3. Draw second "Hmmm..."
    # FIX 2: Consistent use of "Hmmm ..."
    hmmm2_rect = render_text(screen, "Hmmm ...", MAIN_FONT, BLACK, center_x=SCREEN_WIDTH//2, top_y=bubble_rect.bottom + 8)

    # 4. Draw "Let Me Think About What You’ve Done…" 
    below_hmmm2_y = hmmm2_rect.bottom + 8
    
    render_text(
        screen, 
        "Let Me Think About What You’ve Done…", 
        MAIN_FONT, 
        GREY_SUBTITLE, 
        center_x=SCREEN_WIDTH // 2, 
        top_y=below_hmmm2_y
    )
    
    # --- Itemized Feedback List (Drawn below the conversational section) ---
    list_y_start = below_hmmm2_y + 40
    left_x_list = SCREEN_WIDTH // 2 - (SCREEN_WIDTH * 0.3)
    
    for i, item_feedback in enumerate(feedback_data.get('feedback_list', [])):
        if i >= 6: 
            render_text(screen, "...", MAIN_FONT, BLACK, center_x=SCREEN_WIDTH // 2, top_y=list_y_start + i * 24)
            break
            
        render_text(
            screen, 
            f"• {item_feedback}", 
            MAIN_FONT, 
            BLACK, 
            left_x=left_x_list, 
            top_y=list_y_start + i * 24
        )
        
    # 5. Draw Back to Game Button (Text button)
    button_y = SCREEN_HEIGHT - 48 
    back_rect = render_text(
        screen, 
        "Back to Game", 
        BUTTON_FONT, 
        ACCENT_BLUE, 
        center_x=SCREEN_WIDTH // 2, 
        center_y=button_y
    )
    
    return back_rect
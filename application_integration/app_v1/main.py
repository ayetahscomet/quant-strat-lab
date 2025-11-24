# --- main.py (COMPLETE WITH UI SPEC INTEGRATION) ---

import pygame
from ui_elements import *
from game_data import load_daily_challenges, load_master_knowledge_bank, get_current_question, score_answers 

# --- Initialisations ---

# Defining Dimensions (Using constants from ui_elements)
SCREEN_SIZE = (SCREEN_WIDTH, SCREEN_HEIGHT)

pygame.init()
pygame.font.init()

# --- Loading Data (Priority 1) ---
load_master_knowledge_bank()
ALL_GAME_CHALLENGES = load_daily_challenges()
CURRENT_CHALLENGE_DATA = get_current_question(ALL_GAME_CHALLENGES)

# Setting Window
screen = pygame.display.set_mode(SCREEN_SIZE)
pygame.display.set_caption("[NAME]")

# Loading Assets from ui_elements.load_assets
load_assets()

# --- State Management Settings (STANDARDIZED) ---
TITLE = 0
QUESTION_SCREEN = 1
FEEDBACK_SCREEN = 2
ANALYTICS_DASHBOARD = 3

game_state = TITLE

# --- Global Variables for Question Logic ---
current_part_index = 0
user_answers = {}
is_locked_in = False
input_boxes = []
feedback_results = {} 

def handle_title_click(pos, play_button_rect):
    global game_state

    if play_button_rect.collidepoint(pos):
        print("Play button clicked! Moving to Question 1.")
        if CURRENT_CHALLENGE_DATA:
             game_state = QUESTION_SCREEN
        else:
             print("Cannot start game: Challenge data is missing or corrupted.")

# Input box creation remains the same
def create_input_boxes(expected_count):
    global input_boxes
    input_boxes = []
    
    y_start = 180 
    box_width = SCREEN_WIDTH * 0.7 
    box_height = 40
    x_center = SCREEN_WIDTH // 2 
    
    for i in range(expected_count):
        x = x_center - box_width // 2
        y = y_start + i * (box_height + 10)
        box = TextInputBox(x, y, box_width, box_height, MAIN_FONT, BLACK) 
        input_boxes.append(box)


def handle_question_events(event):
    for box in input_boxes:
        box.handle_event(event)


def lock_in_answers():
    global feedback_results, game_state
    
    current_answers = [box.text for box in input_boxes]
    
    feedback_results = score_answers(
        current_answers, 
        CURRENT_CHALLENGE_DATA, 
        current_part_index
    )
    print(f"Scoring complete. Results: {feedback_results}")

    game_state = FEEDBACK_SCREEN


def handle_feedback_click(pos, back_rect):
    global game_state
    
    if back_rect.collidepoint(pos):
        print("Back to Game clicked. Returning to question screen.")
        game_state = QUESTION_SCREEN
            
# --- Initializing Input Boxes on Startup ---
if CURRENT_CHALLENGE_DATA:
    try:
        first_part_count = CURRENT_CHALLENGE_DATA['parts'][0]['expected_count']
        create_input_boxes(first_part_count)
    except (IndexError, TypeError):
        print("Error: CURRENT_CHALLENGE_DATA is invalid or missing 'parts'.")
        input_boxes = []


# --- Core Gaming Loop ---

clock = pygame.time.Clock()
running = True
play_button_rect = pygame.Rect(0, 0, 0, 0)
back_to_game_rect = pygame.Rect(0, 0, 0, 0) 


while running:
    # --- 1. Event Handling (no changes) ---
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        
        if event.type == pygame.MOUSEBUTTONDOWN:
            if game_state == TITLE:
                handle_title_click(event.pos, play_button_rect)
            
            elif game_state == QUESTION_SCREEN:
                if CURRENT_CHALLENGE_DATA and 'lock_in_rect' in locals():
                    if lock_in_rect.collidepoint(event.pos):
                        print("LOCK IN clicked! Processing answers...")
                        lock_in_answers()
            
            elif game_state == FEEDBACK_SCREEN:
                if back_to_game_rect.collidepoint(event.pos):
                    handle_feedback_click(event.pos, back_to_game_rect)


        if game_state == QUESTION_SCREEN:
            handle_question_events(event)


    # --- 2. Rendering / Drawing based on State ---

    # Set default background to WHITE for all screens
    screen.fill(WHITE) 

    if game_state == TITLE:
        play_button_rect = draw_title_screen(screen)
        
        if not CURRENT_CHALLENGE_DATA:
            render_text(
                screen, 
                "ERROR: Challenge data missing. Check daily_challenges.json.", 
                MAIN_FONT, 
                ACCENT_BLUE, 
                center_x=SCREEN_WIDTH // 2, 
                top_y=SCREEN_HEIGHT - 30
            )
    
    # --- Question Screen Logic ---
    elif game_state == QUESTION_SCREEN:
        if CURRENT_CHALLENGE_DATA: 
            lock_in_rect, hint_rect = draw_question_screen(
                screen, 
                CURRENT_CHALLENGE_DATA, 
                current_part_index, 
                input_boxes
            )
        else:
            render_text(screen, "FATAL ERROR: Missing Game Data", HEADER_FONT, BLACK, center_x=SCREEN_WIDTH // 2, center_y=SCREEN_HEIGHT // 2)

    # --- Feedback Screen Logic ---
    elif game_state == FEEDBACK_SCREEN:
        if feedback_results:
            back_to_game_rect = draw_feedback_screen(screen, feedback_results)
        else:
             render_text(screen, "Error: No feedback generated.", HEADER_FONT, BLACK, center_x=SCREEN_WIDTH // 2, center_y=SCREEN_HEIGHT // 2)


    pygame.display.flip()
    clock.tick(60)

pygame.quit()
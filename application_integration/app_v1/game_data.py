import json
import os
from datetime import date

# Defining Content Folder

DATA_DIR = 'data'
DAILY_CHALLENGE_FILE = 'daily_challenges.json'
MASTER_KB_FILE = 'master_kb.json'
DAILY_CHALLENGE_PATH = os.path.join(DATA_DIR, DAILY_CHALLENGE_FILE)
MASTER_KB_PATH = os.path.join(DATA_DIR, MASTER_KB_FILE)

# Global Variables to Store Loaded Data

MASTER_KB = {}

# Lean Question Data Structure Template
# This uses a lookup key (kb_key)

DAILY_CHALLENGE_TEMPLATE = {
    "2025-11-20": { 
        "full_challenge_header": "First Look: Global Geography Challenge",
        "parts": [
            {
                "part_header": "Part A: Name 5 African Capitals",
                "question": "Name **5** capital cities on the African continent.",
                "input_type": "list_entry",
                "expected_count": 5,
                "kb_key": "AfricanCapitals", # <-- NEW: Points to the master_kb.json
                "hint": "Start with the northern or eastern parts of the continent.",
                "error_categories": [
                    # These specific feedback instructions remain here because they are 
                    # specific to the GOAL of this question (must be a CAPITAL, must be in AFRICA).
                    {"category": "wrong_continent", "feedback_text": "Wrong continent. Focus on Africa."},
                    {"category": "is_country_not_capital", "feedback_text": "That's a country, not a capital."},
                ],
            },
            {
                "part_header": "Part B: The Letter A",
                "question": "Name **3** sovereign countries that begin with the letter 'A'.",
                "input_type": "list_entry",
                "expected_count": 3,
                "kb_key": "CountriesStartingWithA",
                "hint": "One is landlocked in Europe, and one is a massive island nation.",
                "error_categories": [
                    {"category": "not_sovereign", "feedback_text": "Is that territory fully sovereign?"},
                    {"category": "wrong_letter", "feedback_text": "This country doesn't start with 'A'."},
                ],
            }
        ],
        "feedback_template": "[CUSTOM RESPONSE: Your list was complete and accurate! See the insights dashboard.]"
    }
}

def load_master_knowledge_bank():
    """Loads the large, static knowledge bank (master_kb.json)."""
    global MASTER_KB
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    
    try:

        with open(MASTER_KB_PATH, 'r') as f:
            MASTER_KB = json.load(f)
            print("Successfully loaded Master Knowledge Bank.")

    except FileNotFoundError:
        print(f"Master KB file {MASTER_KB_FILE} not found. Ensure is is created.")
    
    except json.JSONDecodeError:
        print(f"Error reading JSON from {MASTER_KB_FILE}. File is corrupted.")

def load_daily_challenges():
    """Loads the daily challenge definitions (daily_challenges.json)."""

    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    
    try:

        with open(DAILY_CHALLENGE_PATH, 'r') as f:
            data = json.load(f)
            print(f"Successfully loaded daily challenges from {DAILY_CHALLENGE_FILE}")
            return data
    
    except FileNotFoundError:
        print(f"Daily challenges file {DAILY_CHALLENGE_FILE} not found. Creating placeholder content.")

        with open(DAILY_CHALLENGE_PATH, 'w') as f:
            json.dump(DAILY_CHALLENGE_TEMPLATE, f, indent = 4)
        return DAILY_CHALLENGE_TEMPLATE
    
    except json.JSONDecodeError:
        print(f"Error reading JSON from {DAILY_CHALLENGE_FILE}. File is corrupted.")
        return {}

def get_current_question(all_challenges):
    """Retrieves the question data for the current data."""
    today_str = date.today().strftime("%Y-%m-%d")

    if today_str in all_challenges:
        return all_challenges[today_str]
    
    else:
        print(f"No challenge defined for today ({today_str}). Using fallback date 2025-11-20.")
        return all_challenges.get("2025-11-20")

def normalise_text(text):
    """Normalise text for case-insensitive and whitespace-insensitive comparison."""
    # This is critical for robust scoring (e.g., 'Brazil' == 'brazil ')
    return text.lower().strip()

def get_feedback_message(score, total):
    """Generates a high-level message based on the score."""
    if score == total:
        return "Excellent work! All your answers are correct. On to the next part."
    elif score > 0:
        return f"A solid effort! You got {score} out of {total} correct."
    else:
        return "Hmmm... This is a tough one. Review the knowledge bank and try again."

def score_answers(user_answers_list, challenge_data, current_part_index):
    """
    Scores user answers against the correct answers and provides itemized feedback.
    
    MASTER_KB is assumed to be a global dictionary of knowledge/hints.
    """
    # Defensive check against missing data

    if not challenge_data or not 'parts' in challenge_data:
        return {'score': 0, 'total': 0, 'feedback_list': ["Cannot score: Challenge data missing."], 'general_message': "Data Error"}

    current_part = challenge_data['parts'][current_part_index]

    # IMPORTANT: The 'correct_answers' key must exist in your daily_challenges.json structure!

    correct_answers = [normalise_text(ans) for ans in current_part.get('correct_answers', [])]
    
    score = 0
    total = len(correct_answers)
    feedback_list = []
    
    # Only normalise non-empty answers submitted by the user
    normalised_user_answers = [normalise_text(ans) for ans in user_answers_list if ans.strip()]
    
    # Track used correct answers to handle duplicates/ordering gracefully
    remaining_correct_answers = list(correct_answers)
    
    # 1. Check for exact matches
    for user_ans in normalised_user_answers:
        if user_ans in remaining_correct_answers:
            score += 1
            remaining_correct_answers.remove(user_ans)
            feedback_list.append(f"'{user_ans.title()}' is correct!")
        else:
             feedback_list.append(f"'{user_ans.title()}' is incorrect.")

    # 2. Add feedback for missing required answers
    if score < total:
        feedback_list.append(f"You still need to find {total - score} more answer(s) to complete the set.")
    
    # 3. Fallback/general hint
    if not feedback_list: 
        feedback_list.append("No answers were provided. Review the question.")
        
    return {
        'score': score,
        'total': total,
        'feedback_list': feedback_list,
        'general_message': get_feedback_message(score, total)
    }
# --- src/data/country_profiles.py ---

DEFAULT_PROFILES = {
    "USD": {"mean_drift": 0.0,      "base_vol": 0.0025, "stress_mult": 1.8},
    "EUR": {"mean_drift": 0.0,      "base_vol": 0.0020, "stress_mult": 1.6},
    "GBP": {"mean_drift": 0.0,      "base_vol": 0.0022, "stress_mult": 1.6},
    "JPY": {"mean_drift": 0.0,      "base_vol": 0.0015, "stress_mult": 1.5},
    "BRL": {"mean_drift": -0.00012, "base_vol": 0.0060, "stress_mult": 2.8},
    "ZAR": {"mean_drift": -0.00010, "base_vol": 0.0055, "stress_mult": 2.6},
    "TRY": {"mean_drift": -0.00014, "base_vol": 0.0070, "stress_mult": 3.2},
}

GENERIC_TEMPLATE = {"mean_drift": 0.0, "base_vol": 0.0025, "stress_mult": 2.0}


def get_profiles(currencies=None, override=None):
    """
    Safely return a dict of country FX profiles.

    - currencies: list of currencies. If None → use all defaults.
    - override: dict of overrides { "BRL": {"base_vol": 0.008}, ... }

    RETURNS:
        profiles[currency] = { mean_drift, base_vol, stress_mult }
    """

    if currencies is None:
        currencies = list(DEFAULT_PROFILES.keys())

    profiles = {}

    for c in currencies:
        if c in DEFAULT_PROFILES:
            profiles[c] = DEFAULT_PROFILES[c].copy()
        else:
            print(f"[INFO] Currency '{c}' not in DEFAULT_PROFILES → using GENERIC template.")
            profiles[c] = GENERIC_TEMPLATE.copy()

    if override:
        for c, vals in override.items():
            if c not in profiles:
                profiles[c] = GENERIC_TEMPLATE.copy()
                print(f"[INFO] Override supplied for new currency '{c}' → created generic profile.")

            for k, v in vals.items():
                profiles[c][k] = v

    required = ["mean_drift", "base_vol", "stress_mult"]
    for c in profiles:
        for req in required:
            if req not in profiles[c]:
                profiles[c][req] = GENERIC_TEMPLATE[req]

    return profiles

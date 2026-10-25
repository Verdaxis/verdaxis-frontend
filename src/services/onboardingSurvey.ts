import { api, ApiError } from './api';

const STORAGE_KEY = 'verdaxis_onboarding_survey';

export interface OnboardingSurveyAnswer {
    use_case: string;
    referral_source?: string;
}

export const saveOnboardingSurvey = (email: string, answer: OnboardingSurveyAnswer): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, ...answer }));
    } catch {
        // Storage can be disabled; the survey must not prevent verification.
    }
};

const pendingEmails = new Set<string>();

export const submitSavedOnboardingSurvey = async (email: string): Promise<void> => {
    let saved: string | null;
    let answer: OnboardingSurveyAnswer;
    try {
        saved = localStorage.getItem(STORAGE_KEY);
        if (!saved || pendingEmails.has(email)) return;
        const value = JSON.parse(saved);
        if (!value || value.email !== email || typeof value.use_case !== 'string'
            || (value.referral_source !== undefined && typeof value.referral_source !== 'string')) return;
        answer = { use_case: value.use_case, referral_source: value.referral_source };
    } catch {
        return;
    }

    const clearSavedAnswer = () => {
        try {
            // A later verification may have saved a different answer while this request ran.
            if (localStorage.getItem(STORAGE_KEY) === saved) localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Best-effort cleanup must not affect sign-in.
        }
    };

    pendingEmails.add(email);
    try {
        await api.auth.submitSurvey(answer);
        clearSavedAnswer();
    } catch (error) {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            clearSavedAnswer();
        }
        // Network and server failures keep the answer for the next sign-in.
    } finally {
        pendingEmails.delete(email);
    }
};

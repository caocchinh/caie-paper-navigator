import { FormValues } from "@/components/paper-search/types";

// Check if Chrome storage is available (for extension context)
const isChromeStorageAvailable = (): boolean => {
  return (
    typeof chrome !== "undefined" &&
    chrome.storage &&
    chrome.storage.local !== undefined
  );
};

// Save form values to storage
export const saveFormValues = (values: Partial<FormValues>): void => {
  try {
    if (isChromeStorageAvailable()) {
      chrome.storage.local.get("formValues", (result) => {
        const existingValues = result.formValues || {};
        const updatedValues = { ...existingValues, ...values };
        chrome.storage.local.set({ formValues: updatedValues });
      });
    } else {
      const savedValues = localStorage.getItem("formValues");
      const existingValues = savedValues ? JSON.parse(savedValues) : {};
      const updatedValues = { ...existingValues, ...values };
      localStorage.setItem("formValues", JSON.stringify(updatedValues));
    }
  } catch (error) {
    console.error("Error saving form values:", error);
  }
};

// Load form values from storage
export const loadFormValues = (): Promise<FormValues | null> => {
  return new Promise((resolve) => {
    try {
      if (isChromeStorageAvailable()) {
        chrome.storage.local.get(
          "formValues",
          (result: { formValues?: FormValues }) => {
            if (
              result.formValues &&
              Object.keys(result.formValues).length > 0
            ) {
              resolve(result.formValues);
            } else {
              resolve(null);
            }
          }
        );
      } else {
        const savedValues = localStorage.getItem("formValues");
        if (savedValues) {
          resolve(JSON.parse(savedValues) as FormValues);
        } else {
          resolve(null);
        }
      }
    } catch (error) {
      console.error("Error loading form values:", error);
      resolve(null);
    }
  });
};

// Save quick search values to storage
export const saveQuickSearchValues = (quickCode: string): void => {
  try {
    if (isChromeStorageAvailable()) {
      chrome.storage.local.set({ quickSearchValues: { quickCode } });
    } else {
      localStorage.setItem("quickSearchValues", JSON.stringify({ quickCode }));
    }
  } catch (error) {
    console.error("Error saving quick search values:", error);
  }
};

// Load quick search values from storage
export const loadQuickSearchValues = (): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      if (isChromeStorageAvailable()) {
        chrome.storage.local.get(
          "quickSearchValues",
          (result: { quickSearchValues?: { quickCode: string } }) => {
            if (result.quickSearchValues?.quickCode) {
              resolve(result.quickSearchValues.quickCode);
            } else {
              resolve(null);
            }
          }
        );
      } else {
        const savedValues = localStorage.getItem("quickSearchValues");
        if (savedValues) {
          const parsed = JSON.parse(savedValues) as { quickCode: string };
          resolve(parsed.quickCode || null);
        } else {
          resolve(null);
        }
      }
    } catch (error) {
      console.error("Error loading quick search values:", error);
      resolve(null);
    }
  });
};

// Clear all stored values
export const clearAllValues = (): void => {
  try {
    if (isChromeStorageAvailable()) {
      chrome.storage.local.set({ formValues: null, quickSearchValues: null });
    } else {
      localStorage.removeItem("formValues");
      localStorage.removeItem("quickSearchValues");
    }
  } catch (error) {
    console.error("Error clearing values:", error);
  }
};

// Preference keys type
export type PreferenceKey = "hidePinRecommendation" | "showDialogOnLoad";

// Save a single preference
export const savePreference = (key: PreferenceKey, value: boolean): void => {
  try {
    if (isChromeStorageAvailable()) {
      chrome.storage.local.set({ [key]: value });
    } else {
      localStorage.setItem(key, value.toString());
    }
  } catch (error) {
    console.error(`Error saving preference ${key}:`, error);
  }
};

// Preferences interface
export interface AppPreferences {
  hidePinRecommendation: boolean;
  showDialogOnLoad: boolean;
  formValues: FormValues | null;
}

// Load all app preferences
export const loadPreferences = (): Promise<AppPreferences> => {
  const defaultPreferences: AppPreferences = {
    hidePinRecommendation: false,
    showDialogOnLoad: true,
    formValues: null,
  };

  return new Promise((resolve) => {
    try {
      if (isChromeStorageAvailable()) {
        chrome.storage.local.get(
          ["hidePinRecommendation", "showDialogOnLoad", "formValues"],
          (result) => {
            resolve({
              hidePinRecommendation: result.hidePinRecommendation === true,
              showDialogOnLoad:
                typeof result.showDialogOnLoad === "boolean"
                  ? result.showDialogOnLoad
                  : true,
              formValues: (result.formValues as FormValues) || null,
            });
          }
        );
      } else {
        const hidePinRecommendation =
          localStorage.getItem("hidePinRecommendation") === "true";
        const showDialogOnLoad =
          localStorage.getItem("showDialogOnLoad") !== "false";
        const formValuesStr = localStorage.getItem("formValues");
        const formValues = formValuesStr
          ? (JSON.parse(formValuesStr) as FormValues)
          : null;

        resolve({
          hidePinRecommendation,
          showDialogOnLoad,
          formValues,
        });
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
      resolve(defaultPreferences);
    }
  });
};

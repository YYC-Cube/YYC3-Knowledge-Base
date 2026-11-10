import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { I18nextProvider } from "react-i18next";
import i18n from "../../lib/i18n.config";
import { LanguageSelector } from "../../components/i18n/language-selector";
import { useLanguage } from "../../hooks/use-language";
import {
  formatDate,
  formatCurrency,
  formatNumber,
} from "../../lib/i18n-formatters";

// Mock i18n for testing
jest.mock("../../lib/i18n.config", () => ({
  __esModule: true,
  default: {
    language: "zh-CN",
    changeLanguage: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    t: jest.fn((key, fallback) => fallback || key),
    isInitialized: true,
  },
  SUPPORTED_LANGUAGES: [
    {
      code: "zh-CN",
      name: "简体中文",
      nativeName: "简体中文",
      direction: "ltr",
    },
    {
      code: "en-US",
      name: "English (US)",
      nativeName: "English",
      direction: "ltr",
    },
    { code: "ar-SA", name: "العربية", nativeName: "العربية", direction: "rtl" },
  ],
}));

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

describe("I18n System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("LanguageSelector", () => {
    it("renders language selector with current language", () => {
      render(
        <TestWrapper>
          <LanguageSelector />
        </TestWrapper>
      );

      expect(screen.getByText("简体中文")).toBeInTheDocument();
    });

    it("shows language options when clicked", async () => {
      render(
        <TestWrapper>
          <LanguageSelector />
        </TestWrapper>
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("English")).toBeInTheDocument();
        expect(screen.getByText("العربية")).toBeInTheDocument();
      });
    });

    it("changes language when option selected", async () => {
      render(
        <TestWrapper>
          <LanguageSelector />
        </TestWrapper>
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        const englishOption = screen.getByText("English");
        fireEvent.click(englishOption);
      });

      expect(i18n.changeLanguage).toHaveBeenCalledWith("en-US");
    });
  });

  describe("useLanguage Hook", () => {
    function TestComponent() {
      const { currentLanguage, isRTL, changeLanguage } = useLanguage();

      return (
        <div>
          <span data-testid="current-lang">{currentLanguage}</span>
          <span data-testid="is-rtl">{isRTL.toString()}</span>
          <button onClick={() => changeLanguage("ar-SA")}>
            Change to Arabic
          </button>
        </div>
      );
    }

    it("provides current language information", () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId("current-lang")).toHaveTextContent("zh-CN");
      expect(screen.getByTestId("is-rtl")).toHaveTextContent("false");
    });

    it("handles language change", async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const changeButton = screen.getByText("Change to Arabic");

      await act(async () => {
        fireEvent.click(changeButton);
      });

      expect(i18n.changeLanguage).toHaveBeenCalledWith("ar-SA");
    });
  });

  describe("Formatters", () => {
    describe("formatDate", () => {
      it("formats date for Chinese locale", () => {
        const date = new Date("2023-12-25");
        const formatted = formatDate(date, "zh-CN");

        expect(formatted).toMatch(/2023年12月25日/);
      });

      it("formats date for English locale", () => {
        const date = new Date("2023-12-25");
        const formatted = formatDate(date, "en-US");

        expect(formatted).toMatch(/December 25, 2023/);
      });
    });

    describe("formatCurrency", () => {
      it("formats currency for Chinese locale", () => {
        const formatted = formatCurrency(1234.56, "zh-CN", "CNY");

        expect(formatted).toMatch(/￥1,234.56/);
      });

      it("formats currency for US locale", () => {
        const formatted = formatCurrency(1234.56, "en-US", "USD");

        expect(formatted).toMatch(/\$1,234.56/);
      });
    });

    describe("formatNumber", () => {
      it("formats numbers with locale-specific separators", () => {
        const formatted = formatNumber(123456.789, "zh-CN");

        expect(formatted).toMatch(/123,456.789/);
      });

      it("formats large numbers correctly", () => {
        const formatted = formatNumber(1234567890, "en-US");

        expect(formatted).toMatch(/1,234,567,890/);
      });
    });
  });

  describe("RTL Support", () => {
    it("applies RTL direction for Arabic language", () => {
      // Mock Arabic language
      (i18n as any).language = "ar-SA";

      function RTLTestComponent() {
        const { isRTL } = useLanguage();

        return (
          <div dir={isRTL ? "rtl" : "ltr"} data-testid="rtl-container">
            <span>Test content</span>
          </div>
        );
      }

      render(
        <TestWrapper>
          <RTLTestComponent />
        </TestWrapper>
      );

      const container = screen.getByTestId("rtl-container");
      expect(container).toHaveAttribute("dir", "rtl");
    });

    it("applies LTR direction for non-RTL languages", () => {
      // Mock Chinese language
      (i18n as any).language = "zh-CN";

      function LTRTestComponent() {
        const { isRTL } = useLanguage();

        return (
          <div dir={isRTL ? "rtl" : "ltr"} data-testid="ltr-container">
            <span>Test content</span>
          </div>
        );
      }

      render(
        <TestWrapper>
          <LTRTestComponent />
        </TestWrapper>
      );

      const container = screen.getByTestId("ltr-container");
      expect(container).toHaveAttribute("dir", "ltr");
    });
  });

  describe("Language Persistence", () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it("saves language preference to localStorage", async () => {
      const setItemSpy = jest.spyOn(Storage.prototype, "setItem");

      function PersistenceTestComponent() {
        const { changeLanguage } = useLanguage();

        return (
          <button onClick={() => changeLanguage("en-US")}>
            Change Language
          </button>
        );
      }

      render(
        <TestWrapper>
          <PersistenceTestComponent />
        </TestWrapper>
      );

      const button = screen.getByText("Change Language");

      await act(async () => {
        fireEvent.click(button);
      });

      expect(setItemSpy).toHaveBeenCalledWith("i18nextLng", "en-US");

      setItemSpy.mockRestore();
    });
  });

  describe("Error Handling", () => {
    it("handles translation key not found gracefully", () => {
      const mockT = jest.fn((key, fallback) => fallback || key);
      (i18n as any).t = mockT;

      function ErrorTestComponent() {
        const { t } = useLanguage();

        return <div>{t("non.existent.key", "Fallback text")}</div>;
      }

      render(
        <TestWrapper>
          <ErrorTestComponent />
        </TestWrapper>
      );

      expect(screen.getByText("Fallback text")).toBeInTheDocument();
    });

    it("handles language change failure gracefully", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (i18n.changeLanguage as jest.Mock).mockRejectedValueOnce(
        new Error("Network error")
      );

      function ErrorHandlingTestComponent() {
        const { changeLanguage } = useLanguage();

        return (
          <button onClick={() => changeLanguage("en-US")}>
            Change Language
          </button>
        );
      }

      render(
        <TestWrapper>
          <ErrorHandlingTestComponent />
        </TestWrapper>
      );

      const button = screen.getByText("Change Language");

      await act(async () => {
        fireEvent.click(button);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to change language",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

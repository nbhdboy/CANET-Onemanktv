import { LegalDocShell, LegalSection } from "@/components/legal/LegalDocShell";
import { SiteLegalLinks } from "@/components/legal/SiteLegalLinks";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/constants";

export const metadata = {
  title: `隱私權政策｜${APP_NAME}`,
};

export default function PrivacyPage() {
  return (
    <LegalDocShell title="隱私權政策" updated="2026-09-10">
      <LegalSection title="1. 我們蒐集什麼">
        <p>
          為提供 {APP_NAME}{" "}
          服務，我們可能蒐集：帳號與登入資訊、暱稱與頭像、出生年（用於年齡驗證與場次分群）、聯絡方式（LINE／Instagram／Threads）、歌局與媒合紀錄、付款相關資訊，以及裝置／日誌等營運所需資料。
        </p>
      </LegalSection>
      <LegalSection title="2. 怎麼使用">
        <p>資料用於身分驗證、媒合、通知、付款與客服、安全與防弊、以及改善服務體驗。</p>
        <p>公開資料原則上僅包含暱稱、頭像與評價等您選擇公開的資訊；真實姓名與社群帳號在媒合成功前不會公開交換。</p>
      </LegalSection>
      <LegalSection title="3. 分享與揭露">
        <p>
          除法令要求、保護權利安全、或經您同意外，我們不會出售您的個人資料。為營運需要，可能與金流、雲端託管等必要服務供應商處理資料，並要求其善盡保護義務。
        </p>
      </LegalSection>
      <LegalSection title="4. 保存與安全">
        <p>我們會在營運與法令所需期間保存資料，並採取合理安全措施。請理解網際網路傳輸無法保證百分之百安全。</p>
      </LegalSection>
      <LegalSection title="5. 您的權利">
        <p>您可檢視或更新個人資料（例如設定頁）。若需刪除帳號或其他隱私請求，請來信客服，我們會依法協助處理。</p>
      </LegalSection>
      <LegalSection title="6. Cookie 與類似技術">
        <p>本服務可能使用 Cookie 或類似技術維持登入狀態、記住偏好（例如年齡場）並改善體驗。</p>
      </LegalSection>
      <LegalSection title="7. 聯絡我們">
        <p>
          隱私相關問題請寄至{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-purple-700">
            {SUPPORT_EMAIL}
          </a>
          。
        </p>
      </LegalSection>
      <SiteLegalLinks className="border-t border-[var(--line)] pt-5" />
    </LegalDocShell>
  );
}

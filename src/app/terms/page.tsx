import { LegalDocShell, LegalSection } from "@/components/legal/LegalDocShell";
import { SiteLegalLinks } from "@/components/legal/SiteLegalLinks";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/constants";

export const metadata = {
  title: `使用條款｜${APP_NAME}`,
};

export default function TermsPage() {
  return (
    <LegalDocShell title="使用條款" updated="2026-09-10">
      <LegalSection title="1. 服務說明">
        <p>
          {APP_NAME}（以下稱「本服務」）提供使用者發起或加入 KTV
          唱歌需求、進行媒合與後續聯絡方式交換的平台。本服務不是交友、約會或婚戀服務。
        </p>
      </LegalSection>
      <LegalSection title="2. 資格與帳號">
        <p>您必須年滿 18 歲才能使用本服務。請提供真實且可聯繫的資料，並妥善保管帳號。</p>
        <p>若發現虛假資料、濫用、騷擾或其他違反本條款之行為，我們得暫停或終止帳號。</p>
      </LegalSection>
      <LegalSection title="3. 媒合與費用">
        <p>
          歌局資訊、費用分攤僅供參考；實際消費以 KTV 現場與官方公告為準。平台可能收取服務費或提供點數折抵，細節以結帳頁面顯示為準。
        </p>
        <p>媒合成功後交換之聯絡方式，僅供安排當次唱歌相關事宜，請勿用於騷擾或其他不當用途。</p>
      </LegalSection>
      <LegalSection title="4. 行為準則">
        <p>請尊重其他使用者。禁止欺詐、威脅、性騷擾、公開他人個資、或從事違法行為。</p>
        <p>第一次見面請選擇公開營業場所，並參考安全建議。若感到不適，請立即離開並使用檢舉或封鎖。</p>
      </LegalSection>
      <LegalSection title="5. 免責">
        <p>
          本服務僅提供媒合工具，不保證媒合結果、對方出席或現場體驗。使用者與其他歌友之間的互動與糾紛，原則上由雙方自行處理；涉及違法行為時請向主管機關求助。
        </p>
      </LegalSection>
      <LegalSection title="6. 條款變更">
        <p>我們可能更新本條款。重大變更會以網站公告或其他適當方式通知。繼續使用即視為接受更新後條款。</p>
      </LegalSection>
      <LegalSection title="7. 聯絡我們">
        <p>
          如有疑問，請來信{" "}
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

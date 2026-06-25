"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ExternalLink,
  Filter,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2
} from "lucide-react";
import { BRANDS, SOURCES, type Brand, type BrgConditions, type DashboardData, type SearchPreset, type Source } from "@/lib/types";

type Props = {
  initialData: DashboardData;
};

const brandLabels: Record<Brand, string> = {
  MARRIOTT: "Marriott",
  HILTON: "Hilton",
  HYATT: "Hyatt",
  ACCOR: "Accor"
};

const sourceLabels: Record<Source, string> = {
  official: "공홈",
  google: "Google",
  booking: "Booking",
  agoda: "Agoda",
  expedia: "Expedia",
  hotels: "Hotels.com"
};

type SearchOptions = {
  adults: number;
  rooms: number;
  currency: string;
  includeCash: boolean;
  includePoints: boolean;
  sources: Source[];
  brgConditions: BrgConditions;
};

const defaultSearchOptions: SearchOptions = {
  adults: 2,
  rooms: 1,
  currency: "KRW",
  includeCash: true,
  includePoints: true,
  sources: ["official", "hotels"],
  brgConditions: {
    roomType: "",
    bedType: "any",
    cancellation: "free",
    mealPlan: "any",
    taxPolicy: "taxes_included",
    paymentTiming: "any",
    requirePubliclyBookable: true,
    strictMatch: false
  }
};

export function Dashboard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [selectedHotelId, setSelectedHotelId] = useState(initialData.hotels[0]?.id ?? "");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presetName, setPresetName] = useState("");
  const [searchOptions, setSearchOptions] = useState<SearchOptions>(defaultSearchOptions);
  const [openPanel, setOpenPanel] = useState<"options" | "hotels" | "account" | "promos" | "policies" | null>(null);
  const [hotelDraft, setHotelDraft] = useState({
    brand: "MARRIOTT" as Brand,
    name: "",
    region: "",
    officialUrl: "",
    googleUrl: "",
    bookingUrl: "",
    agodaUrl: "",
    expediaUrl: "",
    hotelsUrl: ""
  });
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const checkout = new Date(today);
  checkout.setDate(today.getDate() + 3);

  const selectedHotel = useMemo(
    () => data.hotels.find((hotel) => hotel.id === selectedHotelId),
    [data.hotels, selectedHotelId]
  );

  const selectedPreset = useMemo(
    () => data.presets.find((preset) => preset.id === selectedPresetId),
    [data.presets, selectedPresetId]
  );

  const quickRechecks = useMemo(() => {
    const seen = new Set<string>();
    return data.runs
      .filter((run) => {
        const key = `${run.hotelId}:${run.checkIn}:${run.checkOut}:${run.sources.join(",")}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
  }, [data.runs]);

  async function refreshDashboard() {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    setData(await response.json());
  }

  async function createSearchRun(formData: FormData) {
    setNotice("");
    const payload = {
      hotelId: formData.get("hotelId"),
      checkIn: formData.get("checkIn"),
      checkOut: formData.get("checkOut"),
      ...searchOptions
    };

    startTransition(async () => {
      const response = await fetch("/api/search-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      setNotice(response.ok ? "조회가 완료되었습니다." : body.error || "조회에 실패했습니다.");
      await refreshDashboard();
    });
  }

  async function quickCheck(sources: Source[]) {
    setNotice("");
    const checkIn = (document.getElementById("checkIn") as HTMLInputElement | null)?.value;
    const checkOut = (document.getElementById("checkOut") as HTMLInputElement | null)?.value;
    if (!selectedHotelId || !checkIn || !checkOut) {
      setNotice("호텔과 날짜를 먼저 선택해주세요.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/search-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: selectedHotelId,
          checkIn,
          checkOut,
          ...searchOptions,
          sources
        })
      });
      const body = await response.json();
      setNotice(response.ok ? "빠른 조회가 완료되었습니다." : body.error || "조회에 실패했습니다.");
      await refreshDashboard();
    });
  }

  function applyPreset(presetId: string) {
    setSelectedPresetId(presetId);
    const preset = data.presets.find((item) => item.id === presetId);
    if (!preset) {
      setPresetName("");
      setSearchOptions(defaultSearchOptions);
      return;
    }
    setPresetName(preset.name);
    setSearchOptions(optionsFromPreset(preset));
  }

  async function savePreset() {
    setNotice("");
    const payload = presetPayload(presetName || "새 검색 옵션", searchOptions);
    startTransition(async () => {
      const response = await fetch("/api/search-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      setNotice(response.ok ? "검색 옵션을 저장했습니다." : body.error || "검색 옵션 저장에 실패했습니다.");
      await refreshDashboard();
      if (body.preset?.id) setSelectedPresetId(body.preset.id);
    });
  }

  async function updatePreset() {
    if (!selectedPresetId) {
      setNotice("수정할 프리셋을 먼저 선택해주세요.");
      return;
    }
    setNotice("");
    startTransition(async () => {
      const response = await fetch(`/api/search-presets/${selectedPresetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(presetPayload(presetName || selectedPreset?.name || "검색 옵션", searchOptions))
      });
      const body = await response.json();
      setNotice(response.ok ? "검색 옵션을 수정했습니다." : body.error || "검색 옵션 수정에 실패했습니다.");
      await refreshDashboard();
    });
  }

  async function deletePreset() {
    if (!selectedPresetId) {
      setNotice("삭제할 프리셋을 먼저 선택해주세요.");
      return;
    }
    setNotice("");
    startTransition(async () => {
      const response = await fetch(`/api/search-presets/${selectedPresetId}`, { method: "DELETE" });
      const body = await response.json();
      setNotice(response.ok ? "검색 옵션을 삭제했습니다." : body.error || "검색 옵션 삭제에 실패했습니다.");
      setSelectedPresetId("");
      setPresetName("");
      await refreshDashboard();
    });
  }

  async function addHotel(formData: FormData) {
    setNotice("");
    startTransition(async () => {
      const response = await fetch("/api/hotels", {
        method: "POST",
        body: formData
      });
      const body = await response.json();
      setNotice(response.ok ? "호텔을 저장했습니다." : body.error || "호텔 저장에 실패했습니다.");
      await refreshDashboard();
    });
  }

  function fillHotelLinks() {
    if (!hotelDraft.name.trim() || !hotelDraft.region.trim()) {
      setNotice("호텔명과 지역을 먼저 입력해주세요.");
      return;
    }
    setNotice("검색 URL을 채웠습니다. 필요하면 저장 전에 수정할 수 있어요.");
    setHotelDraft((current) => ({
      ...current,
      ...buildHotelLinks(current.brand, current.name, current.region)
    }));
  }

  async function saveCredential(formData: FormData) {
    setNotice("");
    startTransition(async () => {
      const response = await fetch("/api/credentials", {
        method: "POST",
        body: formData
      });
      const body = await response.json();
      setNotice(response.ok ? "로그인 정보를 암호화해 저장했습니다." : body.error || "저장에 실패했습니다.");
    });
  }

  async function refreshPromotions() {
    setNotice("");
    startTransition(async () => {
      const response = await fetch("/api/promotions/refresh", { method: "POST" });
      const body = await response.json();
      setNotice(response.ok ? "프로모션 초안을 새로 불러왔습니다." : body.error || "프로모션 갱신에 실패했습니다.");
      await refreshDashboard();
    });
  }

  async function deleteRun(runId: string) {
    setNotice("");
    startTransition(async () => {
      const response = await fetch(`/api/search-runs/${runId}`, { method: "DELETE" });
      const body = await response.json();
      setNotice(response.ok ? "최근 결과를 삭제했습니다." : body.error || "삭제에 실패했습니다.");
      await refreshDashboard();
    });
  }

  async function rerunSearch(run: DashboardData["runs"][number]) {
    setNotice("");
    startTransition(async () => {
      const response = await fetch("/api/search-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: run.hotelId,
          checkIn: run.checkIn.slice(0, 10),
          checkOut: run.checkOut.slice(0, 10),
          adults: run.adults,
          rooms: run.rooms,
          currency: run.currency,
          sources: run.sources,
          includeCash: true,
          includePoints: true,
          brgConditions: run.brgConditions
        })
      });
      const body = await response.json();
      setNotice(response.ok ? "현재 시점 기준으로 다시 조회했습니다." : body.error || "재조회에 실패했습니다.");
      await refreshDashboard();
    });
  }

  async function updateManualRate(runId: string, source: Source, amount: number, currency: string) {
    if (!amount || amount <= 0) {
      setNotice("0보다 큰 금액을 입력해주세요.");
      return;
    }
    setNotice("");
    startTransition(async () => {
      const response = await fetch(`/api/search-runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, amount, currency })
      });
      const body = await response.json();
      setNotice(response.ok ? "실가격을 반영했습니다." : body.error || "실가격 저장에 실패했습니다.");
      await refreshDashboard();
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-moss">
            <ShieldCheck size={18} />
            Personal BRG desk
          </div>
          <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">BoraBora BRG</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
            즐겨찾기 호텔만 골라 공홈과 주요 써드파티 요금을 한 번에 비교합니다. 실제 자동화 설정 전에는
            데모 요금으로 전체 흐름을 확인할 수 있습니다.
          </p>
        </div>
        <div className="panel grid grid-cols-3 divide-x divide-ink/10 overflow-hidden text-center">
          <Metric label="호텔" value={data.hotels.length} />
          <Metric label="프리셋" value={data.presets.length} />
          <Metric label="이벤트" value={data.promotions.length} />
        </div>
      </header>

      {notice ? (
        <div className="border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-ink" style={{ borderRadius: 8 }}>
          {notice}
        </div>
      ) : null}

      {quickRechecks.length ? (
        <section className="grid gap-3 md:grid-cols-3">
          {quickRechecks.map((run) => (
            <QuickRecheckCard key={run.id} run={run} isPending={isPending} onRefresh={rerunSearch} />
          ))}
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1fr_0.65fr]">
        <form action={createSearchRun} className="panel p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={20} className="text-coral" />
              <h2 className="text-lg font-semibold">요금 업데이트</h2>
            </div>
            <button className="inline-flex items-center gap-2 bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ borderRadius: 6 }} disabled={isPending}>
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              업데이트
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_0.55fr_0.55fr]">
            <div>
              <label className="label" htmlFor="hotelId">호텔</label>
              <select className="field" id="hotelId" name="hotelId" value={selectedHotelId} onChange={(event) => setSelectedHotelId(event.target.value)}>
                {data.hotels.map((hotel) => (
                  <option key={hotel.id} value={hotel.id}>
                    {brandLabels[hotel.brand]} · {hotel.name}
                  </option>
                ))}
              </select>
            </div>
            <TextInput label="체크인" name="checkIn" id="checkIn" type="date" defaultValue={toDateInput(tomorrow)} />
            <TextInput label="체크아웃" name="checkOut" id="checkOut" type="date" defaultValue={toDateInput(checkout)} />
            <TextInput label="성인" name="adults" type="number" value={searchOptions.adults} min="1" max="8" onChange={(event) => updateSearchOption("adults", Number(event.target.value || 1))} />
            <TextInput label="객실" name="rooms" type="number" value={searchOptions.rooms} min="1" max="4" onChange={(event) => updateSearchOption("rooms", Number(event.target.value || 1))} />
          </div>

          <div className="mt-4 grid gap-2 border-t border-ink/10 pt-4 sm:grid-cols-3">
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 bg-moss px-4 text-sm font-semibold text-white disabled:opacity-50" style={{ borderRadius: 6 }} onClick={() => quickCheck(["official", "hotels"])} disabled={isPending}>
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              공홈 vs Hotels
            </button>
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 border border-ink/15 bg-white px-4 text-sm font-semibold disabled:opacity-50" style={{ borderRadius: 6 }} onClick={() => quickCheck(["official", "expedia"])} disabled={isPending}>
              <Search size={16} /> 공홈 vs Expedia
            </button>
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 border border-ink/15 bg-white px-4 text-sm font-semibold disabled:opacity-50" style={{ borderRadius: 6 }} onClick={() => quickCheck(["official", "booking"])} disabled={isPending}>
              <Search size={16} /> 공홈 vs Booking
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" className="inline-flex h-9 items-center gap-2 border border-ink/15 bg-white px-3 text-sm font-semibold" style={{ borderRadius: 6 }} onClick={() => togglePanel("options")}>
              <Filter size={16} /> 검색 옵션 <ChevronDown size={15} />
            </button>
            <button type="button" className="inline-flex h-9 items-center gap-2 border border-ink/15 bg-white px-3 text-sm font-semibold" style={{ borderRadius: 6 }} onClick={() => togglePanel("hotels")}>
              <Star size={16} /> 호텔 추가 <ChevronDown size={15} />
            </button>
            <span className="text-xs text-ink/58">
              {selectedPreset ? selectedPreset.name : "기본 옵션"} · {searchOptions.sources.map((source) => sourceLabels[source]).join(", ")}
            </span>
          </div>

          {selectedHotel ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink/60">
              <span>{selectedHotel.region}</span>
              <span>·</span>
              <a className="inline-flex items-center gap-1 underline" href={selectedHotel.officialUrl} target="_blank">
                공홈 열기 <ExternalLink size={12} />
              </a>
            </div>
          ) : null}
        </form>

        <section className="panel p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-moss">빠른 관리</div>
              <h2 className="mt-1 text-lg font-semibold">필요할 때만 열기</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <PanelButton icon={<Save size={16} />} label="프리셋" active={openPanel === "options"} onClick={() => togglePanel("options")} />
            <PanelButton icon={<Star size={16} />} label="호텔" active={openPanel === "hotels"} onClick={() => togglePanel("hotels")} />
            <PanelButton icon={<KeyRound size={16} />} label="로그인" active={openPanel === "account"} onClick={() => togglePanel("account")} />
            <PanelButton icon={<Sparkles size={16} />} label="이벤트" active={openPanel === "promos"} onClick={() => togglePanel("promos")} />
            <PanelButton icon={<BookOpen size={16} />} label="정책" active={openPanel === "policies"} onClick={() => togglePanel("policies")} />
          </div>
        </section>
      </section>

      {openPanel ? (
        <section className="panel p-4 sm:p-5">
          {openPanel === "options" ? (
            <SearchOptionsPanel
              data={data}
              isPending={isPending}
              selectedPresetId={selectedPresetId}
              presetName={presetName}
              searchOptions={searchOptions}
              onApplyPreset={applyPreset}
              onPresetNameChange={setPresetName}
              onSavePreset={savePreset}
              onUpdatePreset={updatePreset}
              onDeletePreset={deletePreset}
              onSearchOptionChange={updateSearchOption}
              onConditionChange={updateCondition}
              onToggleSource={toggleSource}
            />
          ) : null}
          {openPanel === "hotels" ? (
            <HotelPanel
              hotelDraft={hotelDraft}
              isPending={isPending}
              onChange={setHotelDraft}
              onFillHotelLinks={fillHotelLinks}
              onAddHotel={addHotel}
            />
          ) : null}
          {openPanel === "account" ? <AccountPanel isPending={isPending} onSaveCredential={saveCredential} /> : null}
          {openPanel === "promos" ? <PromotionsPanel data={data} isPending={isPending} onRefreshPromotions={refreshPromotions} /> : null}
          {openPanel === "policies" ? <PoliciesPanel data={data} /> : null}
        </section>
      ) : null}

      <section className="grid gap-5">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <CircleDollarSign size={20} className="text-coral" />
              <h2 className="text-lg font-semibold">최근 결과</h2>
            </div>
          </div>
          <div className="divide-y divide-ink/10">
            {data.runs.length === 0 ? (
              <Empty text="아직 조회 결과가 없습니다." />
            ) : (
              data.runs.map((run) => <RunResult key={run.id} run={run} isPending={isPending} onDelete={deleteRun} onRefresh={rerunSearch} onManualRate={updateManualRate} />)
            )}
          </div>
        </section>
      </section>
    </main>
  );

  function updateSearchOption<Key extends keyof SearchOptions>(key: Key, value: SearchOptions[Key]) {
    setSearchOptions((current) => ({ ...current, [key]: value }));
  }

  function updateCondition<Key extends keyof BrgConditions>(key: Key, value: BrgConditions[Key]) {
    setSearchOptions((current) => ({
      ...current,
      brgConditions: {
        ...current.brgConditions,
        [key]: value
      }
    }));
  }

  function toggleSource(source: Source, checked: boolean) {
    setSearchOptions((current) => {
      const sources = checked
        ? Array.from(new Set([...current.sources, source]))
        : current.sources.filter((item) => item !== source);
      return { ...current, sources: sources.length ? sources : [source] };
    });
  }

  function togglePanel(panel: NonNullable<typeof openPanel>) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-5 py-3">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-ink/58">{label}</div>
    </div>
  );
}

function PanelButton({
  icon,
  label,
  active,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center justify-center gap-2 border px-3 text-sm font-semibold transition ${
        active ? "border-moss bg-moss text-white" : "border-ink/15 bg-white hover:border-coral hover:text-coral"
      }`}
      style={{ borderRadius: 6 }}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function QuickRecheckCard({
  run,
  isPending,
  onRefresh
}: {
  run: DashboardData["runs"][number];
  isPending: boolean;
  onRefresh: (run: DashboardData["runs"][number]) => void;
}) {
  const best = run.results
    .flatMap((result) => result.cashRates.map((rate) => ({ ...rate, source: result.source, sourceUrl: result.sourceUrl, prediction: result.brgPrediction })))
    .filter((rate) => rate.source !== "official")
    .sort((a, b) => a.amount - b.amount)[0];

  return (
    <article className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-moss">{brandLabels[run.brand]}</div>
          <h2 className="mt-1 truncate text-base font-semibold">{run.hotelName}</h2>
          <p className="mt-1 text-xs text-ink/58">
            {formatDate(run.checkIn)} - {formatDate(run.checkOut)}
          </p>
        </div>
        <button className="icon-button shrink-0" title="현재 시점으로 다시 조회" type="button" onClick={() => onRefresh(run)} disabled={isPending}>
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>
      {best ? (
        <div className="mt-3 border-t border-ink/10 pt-3">
          <div className="text-xs text-ink/55">최근 후보</div>
          <div className="mt-1 text-lg font-semibold">
            {best.amount.toLocaleString()} {best.currency}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-ink/58">
            <a className="inline-flex items-center gap-1 underline" href={best.sourceUrl} target="_blank">
              {sourceLabels[best.source]} <ExternalLink size={12} />
            </a>
            {best.prediction ? <span>{best.prediction.score}% {best.prediction.band}</span> : null}
          </div>
        </div>
      ) : (
        <p className="mt-3 border-t border-ink/10 pt-3 text-xs text-ink/55">외부 후보가 아직 없습니다.</p>
      )}
    </article>
  );
}

function SearchOptionsPanel({
  data,
  isPending,
  selectedPresetId,
  presetName,
  searchOptions,
  onApplyPreset,
  onPresetNameChange,
  onSavePreset,
  onUpdatePreset,
  onDeletePreset,
  onSearchOptionChange,
  onConditionChange,
  onToggleSource
}: {
  data: DashboardData;
  isPending: boolean;
  selectedPresetId: string;
  presetName: string;
  searchOptions: SearchOptions;
  onApplyPreset: (presetId: string) => void;
  onPresetNameChange: (name: string) => void;
  onSavePreset: () => void;
  onUpdatePreset: () => void;
  onDeletePreset: () => void;
  onSearchOptionChange: <Key extends keyof SearchOptions>(key: Key, value: SearchOptions[Key]) => void;
  onConditionChange: <Key extends keyof BrgConditions>(key: Key, value: BrgConditions[Key]) => void;
  onToggleSource: (source: Source, checked: boolean) => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-2">
        <Filter size={20} className="text-coral" />
        <h2 className="text-lg font-semibold">검색 옵션</h2>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
        <div>
          <label className="label" htmlFor="presetIdPanel">저장된 검색 옵션</label>
          <select className="field" id="presetIdPanel" value={selectedPresetId} onChange={(event) => onApplyPreset(event.target.value)}>
            <option value="">기본 옵션</option>
            {data.presets.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.name}</option>
            ))}
          </select>
        </div>
        <TextInput label="프리셋 이름" name="presetNamePanel" value={presetName} onChange={(event) => onPresetNameChange(event.target.value)} placeholder="도쿄 2인 무료취소" />
        <button type="button" className="mt-5 inline-flex h-10 items-center justify-center gap-2 bg-moss px-3 text-sm font-semibold text-white disabled:opacity-50" style={{ borderRadius: 6 }} onClick={onSavePreset} disabled={isPending}>
          <Save size={16} /> 저장
        </button>
        <button type="button" className="mt-5 inline-flex h-10 items-center justify-center gap-2 border border-ink/15 bg-white px-3 text-sm font-semibold disabled:opacity-50" style={{ borderRadius: 6 }} onClick={onUpdatePreset} disabled={isPending || !selectedPresetId}>
          <RefreshCw size={16} /> 수정
        </button>
        <button type="button" className="mt-5 icon-button" title="프리셋 삭제" onClick={onDeletePreset} disabled={isPending || !selectedPresetId}>
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextInput label="통화" name="currencyPanel" value={searchOptions.currency} maxLength={3} onChange={(event) => onSearchOptionChange("currency", event.target.value.toUpperCase())} />
        <div>
          <span className="label">요금 종류</span>
          <div className="flex h-10 items-center gap-4">
            <Check name="includeCashPanel" label="현금" checked={searchOptions.includeCash} onChange={(checked) => onSearchOptionChange("includeCash", checked)} />
            <Check name="includePointsPanel" label="포인트" checked={searchOptions.includePoints} onChange={(checked) => onSearchOptionChange("includePoints", checked)} />
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {SOURCES.map((source) => (
          <label key={source} className="flex items-center justify-between border border-ink/12 bg-paper px-3 py-2 text-sm" style={{ borderRadius: 6 }}>
            <span>{sourceLabels[source]}</span>
            <input type="checkbox" checked={searchOptions.sources.includes(source)} onChange={(event) => onToggleSource(source, event.target.checked)} />
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextInput label="객실명 키워드" name="roomTypePanel" placeholder="Deluxe King" value={searchOptions.brgConditions.roomType || ""} onChange={(event) => onConditionChange("roomType", event.target.value)} />
        <SelectInput label="침대" name="bedTypePanel" options={[
          ["any", "무관"],
          ["king", "King"],
          ["queen", "Queen"],
          ["twin", "Twin"],
          ["double", "Double"]
        ]} value={searchOptions.brgConditions.bedType} onChange={(value) => onConditionChange("bedType", value as BrgConditions["bedType"])} />
        <SelectInput label="취소 조건" name="cancellationPanel" options={[
          ["any", "무관"],
          ["free", "무료 취소"],
          ["non_refundable", "환불불가"]
        ]} value={searchOptions.brgConditions.cancellation} onChange={(value) => onConditionChange("cancellation", value as BrgConditions["cancellation"])} />
        <SelectInput label="식사 조건" name="mealPlanPanel" options={[
          ["any", "무관"],
          ["room_only", "객실만"],
          ["breakfast", "조식 포함"]
        ]} value={searchOptions.brgConditions.mealPlan} onChange={(value) => onConditionChange("mealPlan", value as BrgConditions["mealPlan"])} />
        <SelectInput label="세금/수수료" name="taxPolicyPanel" options={[
          ["taxes_included", "총액 기준"],
          ["any", "무관"]
        ]} value={searchOptions.brgConditions.taxPolicy} onChange={(value) => onConditionChange("taxPolicy", value as BrgConditions["taxPolicy"])} />
        <SelectInput label="결제 방식" name="paymentTimingPanel" options={[
          ["any", "무관"],
          ["pay_now", "즉시결제"],
          ["pay_at_property", "현장결제"]
        ]} value={searchOptions.brgConditions.paymentTiming} onChange={(value) => onConditionChange("paymentTiming", value as BrgConditions["paymentTiming"])} />
        <div className="flex min-h-10 items-end">
          <Check name="requirePubliclyBookablePanel" label="공개 예약 가능 요금만" checked={searchOptions.brgConditions.requirePubliclyBookable} onChange={(checked) => onConditionChange("requirePubliclyBookable", checked)} />
        </div>
        <div className="flex min-h-10 items-end">
          <Check name="strictMatchPanel" label="조건 불명 결과 제외" checked={searchOptions.brgConditions.strictMatch} onChange={(checked) => onConditionChange("strictMatch", checked)} />
        </div>
      </div>
    </div>
  );
}

function HotelPanel({
  hotelDraft,
  isPending,
  onChange,
  onFillHotelLinks,
  onAddHotel
}: {
  hotelDraft: {
    brand: Brand;
    name: string;
    region: string;
    officialUrl: string;
    googleUrl: string;
    bookingUrl: string;
    agodaUrl: string;
    expediaUrl: string;
    hotelsUrl: string;
  };
  isPending: boolean;
  onChange: React.Dispatch<React.SetStateAction<typeof hotelDraft>>;
  onFillHotelLinks: () => void;
  onAddHotel: (formData: FormData) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Star size={20} className="text-coral" />
        <h2 className="text-lg font-semibold">즐겨찾기 추가</h2>
      </div>
      <form action={onAddHotel} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="brandPanel">브랜드</label>
            <select className="field" id="brandPanel" name="brand" value={hotelDraft.brand} onChange={(event) => onChange((current) => ({ ...current, brand: event.target.value as Brand }))}>
              {BRANDS.map((brand) => (
                <option key={brand} value={brand}>{brandLabels[brand]}</option>
              ))}
            </select>
          </div>
          <TextInput label="지역" name="region" placeholder="Tokyo, Japan" value={hotelDraft.region} onChange={(event) => onChange((current) => ({ ...current, region: event.target.value }))} />
        </div>
        <TextInput label="호텔명" name="name" placeholder="Park Hyatt Tokyo" value={hotelDraft.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} />
        <button type="button" className="inline-flex h-10 items-center justify-center gap-2 border border-moss/25 bg-moss/10 px-4 text-sm font-semibold text-moss disabled:opacity-50" style={{ borderRadius: 6 }} onClick={onFillHotelLinks} disabled={isPending}>
          <Search size={16} /> 검색 URL 채우기
        </button>
        <TextInput label="공홈 URL" name="officialUrl" type="url" placeholder="https://..." value={hotelDraft.officialUrl} onChange={(event) => onChange((current) => ({ ...current, officialUrl: event.target.value }))} />
        <div className="grid gap-3 sm:grid-cols-3">
          <TextInput label="Google" name="googleUrl" type="url" placeholder="https://..." value={hotelDraft.googleUrl} onChange={(event) => onChange((current) => ({ ...current, googleUrl: event.target.value }))} />
          <TextInput label="Booking" name="bookingUrl" type="url" placeholder="https://..." value={hotelDraft.bookingUrl} onChange={(event) => onChange((current) => ({ ...current, bookingUrl: event.target.value }))} />
          <TextInput label="Agoda" name="agodaUrl" type="url" placeholder="https://..." value={hotelDraft.agodaUrl} onChange={(event) => onChange((current) => ({ ...current, agodaUrl: event.target.value }))} />
          <TextInput label="Expedia" name="expediaUrl" type="url" placeholder="https://..." value={hotelDraft.expediaUrl} onChange={(event) => onChange((current) => ({ ...current, expediaUrl: event.target.value }))} />
          <TextInput label="Hotels.com" name="hotelsUrl" type="url" placeholder="https://..." value={hotelDraft.hotelsUrl} onChange={(event) => onChange((current) => ({ ...current, hotelsUrl: event.target.value }))} />
        </div>
        <button className="inline-flex h-10 items-center justify-center gap-2 bg-moss px-4 text-sm font-semibold text-white disabled:opacity-50" style={{ borderRadius: 6 }} disabled={isPending}>
          <Plus size={16} /> 저장
        </button>
      </form>
    </div>
  );
}

function AccountPanel({ isPending, onSaveCredential }: { isPending: boolean; onSaveCredential: (formData: FormData) => void }) {
  return (
    <form action={onSaveCredential} className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-3 flex items-center gap-2">
        <KeyRound size={20} className="text-coral" />
        <h2 className="text-lg font-semibold">체인 로그인</h2>
      </div>
      <div>
        <label className="label" htmlFor="credentialBrand">브랜드</label>
        <select className="field" id="credentialBrand" name="brand">
          {BRANDS.map((brand) => (
            <option key={brand} value={brand}>{brandLabels[brand]}</option>
          ))}
        </select>
      </div>
      <TextInput label="아이디" name="username" autoComplete="username" />
      <TextInput label="비밀번호" name="password" type="password" autoComplete="current-password" />
      <button className="inline-flex h-10 items-center justify-center gap-2 bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-3" style={{ borderRadius: 6 }} disabled={isPending}>
        <ShieldCheck size={16} /> 암호화 저장
      </button>
    </form>
  );
}

function PromotionsPanel({ data, isPending, onRefreshPromotions }: { data: DashboardData; isPending: boolean; onRefreshPromotions: () => void }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-coral" />
          <h2 className="text-lg font-semibold">이벤트</h2>
        </div>
        <button className="icon-button" title="이벤트 새로고침" onClick={onRefreshPromotions} disabled={isPending}>
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {data.promotions.length === 0 ? (
          <Empty text="저장된 이벤트가 없습니다." />
        ) : (
          data.promotions.map((promotion) => (
            <a key={promotion.id} className="block border border-ink/10 bg-paper px-4 py-3 transition hover:bg-white" style={{ borderRadius: 6 }} href={promotion.sourceUrl} target="_blank">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-moss">{brandLabels[promotion.brand]}</span>
                <span className="text-xs text-ink/50">{promotion.status}</span>
              </div>
              <h3 className="mt-1 text-sm font-semibold">{promotion.title}</h3>
              <p className="mt-1 text-xs leading-5 text-ink/64">{promotion.summary}</p>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

function PoliciesPanel({ data }: { data: DashboardData }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <BookOpen size={20} className="text-coral" />
        <h2 className="text-lg font-semibold">BRG 정책</h2>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {data.policies.map((policy) => (
          <a key={policy.brand} className="block border border-ink/10 bg-paper px-4 py-3 transition hover:bg-white" style={{ borderRadius: 6 }} href={policy.sourceUrl} target="_blank">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-moss">{brandLabels[policy.brand]}</span>
              <span className="text-xs text-ink/50">검토 {policy.lastReviewedAt}</span>
            </div>
            <h3 className="mt-1 text-sm font-semibold">{policy.reward}</h3>
            <p className="mt-1 text-xs leading-5 text-ink/64">{policy.claimWindow}</p>
            <p className="mt-1 text-xs leading-5 text-ink/58">{policy.summary}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, ...rest } = props;
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input className="field" id={name} name={name} {...rest} />
    </div>
  );
}

function SelectInput({
  label,
  name,
  options,
  value,
  onChange
}: {
  label: string;
  name: string;
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select className="field" id={name} name={name} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
    </div>
  );
}

function Check({
  name,
  label,
  checked,
  onChange
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input name={name} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function RunResult({
  run,
  isPending,
  onDelete,
  onRefresh,
  onManualRate
}: {
  run: DashboardData["runs"][number];
  isPending: boolean;
  onDelete: (runId: string) => void;
  onRefresh: (run: DashboardData["runs"][number]) => void;
  onManualRate: (runId: string, source: Source, amount: number, currency: string) => void;
}) {
  const cheapest = run.results
    .flatMap((result) => result.cashRates.map((rate) => ({ ...rate, source: result.source })))
    .filter((rate) => rate.conditionMatch === "MATCH" || (!run.brgConditions.strictMatch && rate.conditionMatch === "UNKNOWN"))
    .sort((a, b) => a.amount - b.amount)[0];

  return (
    <article className="px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold text-moss">{brandLabels[run.brand]} · {run.status}</div>
          <h3 className="mt-1 text-base font-semibold">{run.hotelName}</h3>
          <p className="mt-1 text-xs text-ink/60">
            {formatDate(run.checkIn)} - {formatDate(run.checkOut)}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex gap-2">
            <button className="icon-button" title="현재 시점으로 다시 조회" type="button" onClick={() => onRefresh(run)} disabled={isPending}>
              <RefreshCw size={16} />
            </button>
            <button className="icon-button" title="최근 결과 삭제" type="button" onClick={() => onDelete(run.id)} disabled={isPending}>
              <Trash2 size={16} />
            </button>
          </div>
          {cheapest ? (
            <div className="text-left sm:text-right">
              <div className="text-xs text-ink/55">최저 후보</div>
              <div className="text-lg font-semibold">{cheapest.amount.toLocaleString()} {cheapest.currency}</div>
              <div className="text-xs text-ink/55">{sourceLabels[cheapest.source]}</div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/58">
        <span className="border border-ink/10 bg-white px-2 py-1" style={{ borderRadius: 999 }}>
          취소: {conditionLabel("cancellation", run.brgConditions.cancellation)}
        </span>
        <span className="border border-ink/10 bg-white px-2 py-1" style={{ borderRadius: 999 }}>
          식사: {conditionLabel("mealPlan", run.brgConditions.mealPlan)}
        </span>
        <span className="border border-ink/10 bg-white px-2 py-1" style={{ borderRadius: 999 }}>
          세금: {conditionLabel("taxPolicy", run.brgConditions.taxPolicy)}
        </span>
        {run.brgConditions.strictMatch ? (
          <span className="border border-coral/20 bg-coral/10 px-2 py-1 text-coral" style={{ borderRadius: 999 }}>
            조건 불명 제외
          </span>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {run.results.map((result) => (
          <div key={result.source} className="border border-ink/10 bg-paper p-3" style={{ borderRadius: 6 }}>
            <div className="flex items-center justify-between gap-3">
              <a className="inline-flex items-center gap-1 text-sm font-semibold underline" href={result.sourceUrl} target="_blank">
                {sourceLabels[result.source]} <ExternalLink size={13} />
              </a>
              <span className="text-xs text-ink/55">{Math.round(result.confidence * 100)}%</span>
            </div>
            {result.cashRates[0] ? (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm">
                    {result.cashRates[0].amount.toLocaleString()} {result.cashRates[0].currency}
                    <span className="text-xs text-ink/55"> · {result.feesIncluded ? "세금 포함" : "세금 확인 필요"}</span>
                  </p>
                  <ConditionBadge match={result.cashRates[0].conditionMatch || "UNKNOWN"} />
                </div>
                {result.cashRates[0].conditionNotes?.length ? (
                  <p className="mt-1 text-xs leading-5 text-ink/58">
                    {result.cashRates[0].conditionNotes.join(" · ")}
                  </p>
                ) : null}
              </>
            ) : null}
            {result.pointsRates[0] ? (
              <p className="mt-1 text-xs text-ink/65">{result.pointsRates[0].points.toLocaleString()} pts</p>
            ) : null}
            {result.brgPrediction ? <Prediction prediction={result.brgPrediction} /> : null}
            <ManualRateForm
              runId={run.id}
              source={result.source}
              currency={result.cashRates[0]?.currency || run.currency}
              defaultAmount={result.cashRates[0]?.amount}
              isPending={isPending}
              onManualRate={onManualRate}
            />
            {result.failureReason ? <p className="mt-2 text-xs leading-5 text-coral">{result.failureReason}</p> : null}
          </div>
        ))}
      </div>
    </article>
  );
}

function ManualRateForm({
  runId,
  source,
  currency,
  defaultAmount,
  isPending,
  onManualRate
}: {
  runId: string;
  source: Source;
  currency: string;
  defaultAmount?: number;
  isPending: boolean;
  onManualRate: (runId: string, source: Source, amount: number, currency: string) => void;
}) {
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");

  return (
    <div className="mt-3 flex gap-2 border-t border-ink/10 pt-3">
      <input
        className="field h-9"
        inputMode="numeric"
        aria-label={`${sourceLabels[source]} 실가격`}
        value={amount}
        onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
        placeholder="실가격"
      />
      <button
        type="button"
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1 bg-ink px-3 text-xs font-semibold text-white disabled:opacity-50"
        style={{ borderRadius: 6 }}
        disabled={isPending}
        onClick={() => onManualRate(runId, source, Number(amount), currency)}
      >
        반영
      </button>
    </div>
  );
}

function Prediction({ prediction }: { prediction: NonNullable<DashboardData["runs"][number]["results"][number]["brgPrediction"]> }) {
  const styles = {
    HIGH: "border-moss/20 bg-moss/10 text-moss",
    MEDIUM: "border-amber-500/25 bg-amber-50 text-amber-700",
    LOW: "border-coral/25 bg-coral/10 text-coral",
    BLOCKED: "border-ink/15 bg-white text-ink/60"
  };
  const labels = {
    HIGH: "높음",
    MEDIUM: "보통",
    LOW: "낮음",
    BLOCKED: "제외"
  };

  return (
    <div className="mt-3 border-t border-ink/10 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`border px-2 py-1 text-xs font-semibold ${styles[prediction.band]}`} style={{ borderRadius: 999 }}>
          BRG 예측 {prediction.score}% · {labels[prediction.band]}
        </span>
        <a className="text-xs underline text-ink/58" href={prediction.policySourceUrl} target="_blank">
          정책 보기
        </a>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink/64">{prediction.headline}</p>
      {[...prediction.blockers, ...prediction.riskFactors, ...prediction.positiveFactors].slice(0, 4).length ? (
        <p className="mt-1 text-xs leading-5 text-ink/52">
          {[...prediction.blockers, ...prediction.riskFactors, ...prediction.positiveFactors].slice(0, 4).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function ConditionBadge({ match }: { match: "MATCH" | "MISMATCH" | "UNKNOWN" }) {
  const styles = {
    MATCH: "border-moss/20 bg-moss/10 text-moss",
    MISMATCH: "border-coral/25 bg-coral/10 text-coral",
    UNKNOWN: "border-ink/15 bg-white text-ink/60"
  };
  const text = {
    MATCH: "조건 일치",
    MISMATCH: "조건 불일치",
    UNKNOWN: "확인 필요"
  };

  return (
    <span className={`border px-2 py-1 text-xs font-semibold ${styles[match]}`} style={{ borderRadius: 999 }}>
      {text[match]}
    </span>
  );
}

function conditionLabel(kind: "cancellation" | "mealPlan" | "taxPolicy", value: string) {
  const labels: Record<string, string> = {
    any: "무관",
    free: "무료 취소",
    non_refundable: "환불불가",
    room_only: "객실만",
    breakfast: "조식 포함",
    taxes_included: "총액"
  };
  return labels[value] || value;
}

function Empty({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm text-ink/55">{text}</div>;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

function optionsFromPreset(preset: SearchPreset): SearchOptions {
  return {
    adults: preset.adults,
    rooms: preset.rooms,
    currency: preset.currency,
    includeCash: preset.includeCash,
    includePoints: preset.includePoints,
    sources: preset.sources,
    brgConditions: preset.brgConditions
  };
}

function presetPayload(name: string, options: SearchOptions) {
  return {
    name,
    adults: options.adults,
    rooms: options.rooms,
    currency: options.currency,
    sources: options.sources,
    includeCash: options.includeCash,
    includePoints: options.includePoints,
    brgConditions: options.brgConditions
  };
}

function buildHotelLinks(brand: Brand, name: string, region: string) {
  const query = `${name} ${region}`.replace(/\s+/g, " ").trim();
  const encoded = encodeURIComponent(query);

  return {
    officialUrl: officialSearchUrl(brand, encoded),
    googleUrl: `https://www.google.com/travel/hotels?q=${encoded}`,
    bookingUrl: `https://www.booking.com/searchresults.html?ss=${encoded}`,
    agodaUrl: `https://www.agoda.com/search?textToSearch=${encoded}`,
    expediaUrl: `https://www.expedia.com/Hotel-Search?destination=${encoded}`,
    hotelsUrl: `https://www.hotels.com/Hotel-Search?destination=${encoded}`
  };
}

function officialSearchUrl(brand: Brand, encodedQuery: string) {
  const urls: Record<Brand, string> = {
    MARRIOTT: `https://www.marriott.com/search/findHotels.mi?destinationAddress.destination=${encodedQuery}`,
    HILTON: `https://www.hilton.com/en/search/?query=${encodedQuery}`,
    HYATT: `https://www.hyatt.com/search?location=${encodedQuery}`,
    ACCOR: `https://all.accor.com/search/index.en.shtml?destination=${encodedQuery}`
  };
  return urls[brand];
}

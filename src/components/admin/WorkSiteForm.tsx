"use client";

import { useRef, useState } from "react";
import { createWorkSite } from "@/app/admin/work-sites/actions";

export default function WorkSiteForm() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("이 브라우저에서는 위치 확인을 지원하지 않습니다.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      () => {
        setLocationError("위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.");
        setIsLocating(false);
      }
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createWorkSite(formData);
        formRef.current?.reset();
        setLatitude("");
        setLongitude("");
      }}
      className="flex flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-xs tracking-wide text-charcoal/70">
          근무지 이름
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="예: 본사 사무실, OO 현장"
          className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="address" className="text-xs tracking-wide text-charcoal/70">
          주소 (선택)
        </label>
        <input
          id="address"
          name="address"
          type="text"
          className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="latitude" className="text-xs tracking-wide text-charcoal/70">
            위도
          </label>
          <input
            id="latitude"
            name="latitude"
            type="text"
            required
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="longitude" className="text-xs tracking-wide text-charcoal/70">
            경도
          </label>
          <input
            id="longitude"
            name="longitude"
            type="text"
            required
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={isLocating}
        className="self-start rounded-full border border-charcoal/30 px-4 py-2 text-xs text-charcoal hover:border-charcoal disabled:opacity-50"
      >
        {isLocating ? "위치 확인 중..." : "현재 위치 사용 (이 장소에서 클릭)"}
      </button>
      {locationError && <p className="text-xs text-red-700">{locationError}</p>}

      <div className="flex flex-col gap-2">
        <label htmlFor="radius_meters" className="text-xs tracking-wide text-charcoal/70">
          허용 반경 (미터)
        </label>
        <input
          id="radius_meters"
          name="radius_meters"
          type="number"
          defaultValue={200}
          min={20}
          className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
        />
      </div>

      <button
        type="submit"
        className="mt-2 self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold"
      >
        근무지 등록
      </button>
    </form>
  );
}

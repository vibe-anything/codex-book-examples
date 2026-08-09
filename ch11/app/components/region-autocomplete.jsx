'use client';

import { useEffect, useId, useRef, useState } from 'react';

const INITIAL_VALUE = '서울특별시 강남구';

export default function RegionAutocomplete() {
  const [value, setValue] = useState(INITIAL_VALUE);
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const blurTimer = useRef(null);

  useEffect(() => {
    const query = value.trim();

    if (!query) {
      setItems([]);
      setIsOpen(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/regions?query=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json();

        if (response.ok && data.status === 'SUCCESS') {
          setItems(data.items || []);
          setIsOpen(true);
          setActiveIndex(-1);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setItems([]);
          setIsOpen(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  function selectItem(item) {
    setValue(item.regionName);
    setItems([]);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' && items.length) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === 'ArrowUp' && items.length) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectItem(items[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <label className="region-autocomplete">
      지역명
      <input
        name="regionName"
        value={value}
        placeholder="예: 서울 강남구"
        required
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen && items.length > 0}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => items.length && setIsOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setIsOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
      />
      {isOpen && items.length > 0 ? (
        <ul id={listboxId} className="region-suggestions" role="listbox" aria-label="지역명 추천">
          {items.map((item, index) => (
            <li
              key={item.regionCode}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'active' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectItem(item)}
            >
              {item.regionName}
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}

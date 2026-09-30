"use client";
import { useEffect, useRef, type ComponentProps } from "react";
import { Slider } from "@/components/ui/slider";
// The catalog component puts root ARIA props on its wrapper, so label the actual thumb.
export function LabeledSlider({
  labelId,
  onGestureEnd,
  ...props
}: ComponentProps<typeof Slider> & {
  labelId: string;
  onGestureEnd: () => void;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    wrapper.current
      ?.querySelector('[role="slider"]')
      ?.setAttribute("aria-labelledby", labelId);
  }, [labelId]);
  return (
    <div ref={wrapper} onBlur={onGestureEnd} onKeyUp={onGestureEnd}>
      <Slider {...props} />
    </div>
  );
}

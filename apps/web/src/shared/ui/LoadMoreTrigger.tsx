import { useEffect, useRef } from "react";

interface LoadMoreTriggerProps {
   onVisible: () => void;
   /** nothing is watched: there is no more to load, it is loading or it failed */
   disabled: boolean;
}

/**
 * An empty element to put after a list: calls onVisible when it scrolls near the view, to load the
 * next page. Enabled again while still in view (a page shorter than the screen), it calls at once.
 */
export function LoadMoreTrigger({ onVisible, disabled }: LoadMoreTriggerProps) {
   const ref = useRef<HTMLDivElement>(null);
   // the latest callback, without watching anew on every render
   const onVisibleRef = useRef(onVisible);
   onVisibleRef.current = onVisible;

   useEffect(() => {
      const element = ref.current;
      if (!element || disabled) return;
      const observer = new IntersectionObserver(
         ([entry]) => {
            if (entry?.isIntersecting) onVisibleRef.current();
         },
         // a screen ahead: the next page is there before the end is reached
         { rootMargin: "100% 0px" },
      );
      observer.observe(element);
      return () => observer.disconnect();
   }, [disabled]);

   return <div ref={ref} />;
}

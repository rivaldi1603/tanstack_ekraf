"use client";

import { cn } from "cn";
import { Slider as SliderPrimitive } from "radix-ui";
import * as React from "react";

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
	const _values = React.useMemo(
		() => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
		[value, defaultValue, min, max],
	);

	// Stable, unique keys per thumb. Two thumbs can legally share the same value
	// (e.g. a collapsed range), so the value alone is not unique — we suffix the
	// n-th occurrence of a value.
	const _thumbKeys = React.useMemo(() => {
		const seen = new Map<string, number>();
		return _values.map((thumbValue) => {
			const base = String(thumbValue);
			const occurrence = (seen.get(base) ?? 0) + 1;
			seen.set(base, occurrence);
			return `thumb-${base}-${occurrence}`;
		});
	}, [_values]);

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			className={cn(
				"relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Track
				data-slot="slider-track"
				className={cn(
					"relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
				)}
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					className={cn(
						"absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
					)}
				/>
			</SliderPrimitive.Track>
			{_thumbKeys.map((thumbKey) => (
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					key={thumbKey}
					className="block size-4 shrink-0 rounded-full border border-primary bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
				/>
			))}
		</SliderPrimitive.Root>
	);
}

export { Slider };

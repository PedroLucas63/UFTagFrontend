import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

type LoadingProps = {
   message?: string;
   variant?: "full" | "inline";
   size?: "sm" | "md" | "lg";
   color?: string;
   textClassName?: string;
   containerClassName?: string;
};

const sizeMap = {
   sm: 6,
   md: 8,
   lg: 10,
};

export function Loading({
   message = "Carregando...",
   variant = "full",
   size = "md",
   color = "#2563EB",
   textClassName,
   containerClassName = "",
}: LoadingProps) {
   const dots = useRef([
      new Animated.Value(0.3),
      new Animated.Value(0.3),
      new Animated.Value(0.3),
   ]).current;

   useEffect(() => {
      const sequences = dots.map((dot) =>
         Animated.sequence([
            Animated.timing(dot, {
               toValue: 1,
               duration: 450,
               useNativeDriver: true,
            }),
            Animated.timing(dot, {
               toValue: 0.3,
               duration: 450,
               useNativeDriver: true,
            }),
         ])
      );

      const animation = Animated.loop(
         Animated.stagger(200, sequences)
      );

      animation.start();

      return () => {
         animation.stop();
      };
   }, [dots]);

   const dotSize = sizeMap[size];
   const isFull = variant === "full";

   const wrapperClassName = isFull
      ? `items-center justify-center bg-slate-50 px-6 ${containerClassName}`
      : `flex-row items-center gap-2 ${containerClassName}`;

   const labelClassName =
      textClassName ??
      (isFull
         ? "text-slate-600 text-base"
         : "text-slate-600 text-sm");

   return (
      <View className={wrapperClassName}>
         {isFull ? (
            <View className="items-center">
               <View className="w-16 h-16 rounded-2xl bg-blue-600 items-center justify-center mb-4 shadow">
                  <Text className="text-white text-xl font-bold">
                     UF
                  </Text>
               </View>

               <View className="bg-white rounded-3xl px-8 py-5 items-center shadow border border-blue-100">
                  <View className="flex-row items-center gap-2">
                     {dots.map((dot, index) => (
                        <Animated.View
                           key={`dot-${index}`}
                           style={{
                              width: dotSize,
                              height: dotSize,
                              borderRadius: dotSize / 2,
                              backgroundColor: color,
                              opacity: dot,
                              transform: [
                                 {
                                    scale: dot.interpolate({
                                       inputRange: [0.3, 1],
                                       outputRange: [0.85, 1.2],
                                    }),
                                 },
                              ],
                           }}
                        />
                     ))}
                  </View>

                  {message ? (
                     <Text className={`mt-3 ${labelClassName}`}>
                        {message}
                     </Text>
                  ) : null}
               </View>
            </View>
         ) : (
            <>
               <View className="flex-row items-center gap-2">
                  {dots.map((dot, index) => (
                     <Animated.View
                        key={`dot-${index}`}
                        style={{
                           width: dotSize,
                           height: dotSize,
                           borderRadius: dotSize / 2,
                           backgroundColor: color,
                           opacity: dot,
                           transform: [
                              {
                                 scale: dot.interpolate({
                                    inputRange: [0.3, 1],
                                    outputRange: [0.85, 1.2],
                                 }),
                              },
                           ],
                        }}
                     />
                  ))}
               </View>

               {message ? (
                  <Text className={labelClassName}>
                     {message}
                  </Text>
               ) : null}
            </>
         )}
      </View>
   );
}

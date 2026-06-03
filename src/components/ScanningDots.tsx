import { useRef, useEffect } from "react";
import { Animated, View } from "react-native";

export function ScanningDots() {
   const dots = [
      useRef(new Animated.Value(0.3)).current,
      useRef(new Animated.Value(0.3)).current,
      useRef(new Animated.Value(0.3)).current,
   ];

   useEffect(() => {
      const animations = dots.map((dot, index) =>
         Animated.loop(
            Animated.sequence([
               Animated.delay(index * 200),
               Animated.timing(dot, {
                  toValue: 1,
                  duration: 400,
                  useNativeDriver: true,
               }),
               Animated.timing(dot, {
                  toValue: 0.3,
                  duration: 400,
                  useNativeDriver: true,
               }),
            ])
         )
      );

      animations.forEach(a => a.start());

      return () => animations.forEach(a => a.stop());
   }, []);

   return (
      <View className="flex-row items-center justify-center gap-2 mt-8">
         {dots.map((opacity, index) => (
            <Animated.View
               key={index}
               style={{ opacity }}
               className="w-2 h-2 rounded-full bg-blue-600"
            />
         ))}
      </View>
   );
}
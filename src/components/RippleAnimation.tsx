import { useRef, useEffect } from "react";
import { Animated } from "react-native";

export function RippleAnimation() {
   const animatedValues = [
      useRef(new Animated.Value(0)).current,
      useRef(new Animated.Value(0)).current,
      useRef(new Animated.Value(0)).current,
   ];

   useEffect(() => {
      const animations: Animated.CompositeAnimation[] = [];
      const timeouts: ReturnType<typeof setTimeout>[] = [];

      animatedValues.forEach((value, index) => {
         const start = () => {
            const animation = Animated.loop(
               Animated.timing(value, {
                  toValue: 1,
                  duration: 2500,
                  useNativeDriver: true,
               })
            );

            animations.push(animation);
            animation.start();
         };

         value.setValue(0);

         if (index === 0) {
            start();
         } else {
            timeouts.push(
               setTimeout(start, index * 500)
            );
         }
      });

      return () => {
         animations.forEach(a => a.stop());
         timeouts.forEach(clearTimeout);
      };
   }, []);

   return (
      <>
         {animatedValues.map((value, index) => {
            const scale = value.interpolate({
               inputRange: [0, 1],
               outputRange: [1, 2.5],
            });

            const opacity = value.interpolate({
               inputRange: [0, 0.3, 1],
               outputRange: [0.8, 0.4, 0],
            });

            return (
               <Animated.View
                  key={index}
                  style={{
                     position: "absolute",
                     width: 192,
                     height: 192,
                     borderRadius: 999,
                     borderWidth: 4,
                     borderColor: "#2563EB",
                     transform: [{ scale }],
                     opacity,
                  }}
               />
            );
         })}
      </>
   );
}
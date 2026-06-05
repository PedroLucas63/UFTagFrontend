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
                  duration: 1500, // 1 segundo de duração para cada ciclo
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
               setTimeout(start, index * 150) // 200ms de atraso para dar o efeito de um círculo dentro do outro
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
               outputRange: [0.2, 1.7], // Começa menor perto do ícone e expande mais para fora
            });

            const opacity = value.interpolate({
               inputRange: [0, 0.2, 1],
               outputRange: [0.7, 0.4, 0], // Vai ficando mais transparente conforme cresce
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
                     borderColor: "#3B82F6",
                     transform: [{ scale }],
                     opacity,
                  }}
               />
            );
         })}
      </>
   );
}
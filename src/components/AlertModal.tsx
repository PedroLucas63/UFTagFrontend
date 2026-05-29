import { Modal, Text, TouchableOpacity, View } from "react-native";

type AlertModalProps = {
   visible: boolean;
   title: string;
   message: string;
   onClose: () => void;
};

export function AlertModal({
   visible,
   title,
   message,
   onClose,
}: AlertModalProps) {
   return (
      <Modal
         visible={visible}
         transparent
         animationType="fade"
         onRequestClose={onClose}
      >
         <View className="flex-1 items-center justify-center bg-black/40 px-6">
            <View className="w-full max-w-md rounded-2xl bg-white p-6">
               <Text className="text-lg font-semibold text-gray-900">
                  {title}
               </Text>

               <Text className="mt-2 text-sm text-gray-700">
                  {message}
               </Text>

               <TouchableOpacity
                  onPress={onClose}
                  className="mt-6 rounded-xl bg-blue-600 py-3"
               >
                  <Text className="text-center text-sm font-semibold text-white">
                     Ok
                  </Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>
   );
}

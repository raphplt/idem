import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: "#0d0d12" },
            tabBarStyle: {
              backgroundColor: "#12121a",
              borderTopColor: "#22222e",
            },
            tabBarActiveTintColor: "#ffffff",
            tabBarInactiveTintColor: "#666675",
            tabBarIcon: () => null,
            tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
            tabBarLabelPosition: "beside-icon",
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Noter" }} />
          <Tabs.Screen name="passport" options={{ title: "Passeport" }} />
        </Tabs>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

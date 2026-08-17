import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="album" options={{ title: "Álbum" }} />
      <Tabs.Screen name="catalog" options={{ title: "Catálogo" }} />
      <Tabs.Screen name="value" options={{ title: "Valor" }} />
    </Tabs>
  );
}

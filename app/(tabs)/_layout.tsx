import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: "Início" }} />
      <Tabs.Screen name="album" options={{ title: "Álbum" }} />
      <Tabs.Screen name="catalog" options={{ title: "Catálogo" }} />
      <Tabs.Screen name="market" options={{ title: "Mercado" }} />
      <Tabs.Screen name="value" options={{ title: "Valor" }} />
      <Tabs.Screen name="matches" options={{ title: "Trocas" }} />
      <Tabs.Screen name="meetups" options={{ title: "Encontros" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}

import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Linking, Pressable, Text, View } from "react-native";
import { listNews, type NewsItem } from "../../src/features/news/newsRepository";
import { registerForPushNotifications } from "../../src/features/notifications/registerForPush";
import {
  dismissSetRelease,
  listUndismissedSetReleases,
  type SetRelease
} from "../../src/features/news/setReleasesRepository";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function HomeScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [releases, setReleases] = useState<SetRelease[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  useFocusEffect(
    useCallback(() => {
      listNews()
        .then(setNews)
        .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar notícias"));
      listUndismissedSetReleases()
        .then(setReleases)
        .catch(() => setReleases([]));
    }, [])
  );

  const handleDismiss = (setReleaseId: string) => {
    dismissSetRelease(setReleaseId)
      .then(() => setReleases((current) => current.filter((release) => release.id !== setReleaseId)))
      .catch((err: Error) => Alert.alert("Erro", err.message));
  };

  const handleOpenNews = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert("Erro", "Não foi possível abrir o link"));
  };

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {releases.map((release) => (
        <View
          key={release.id}
          testID={`home-set-release-banner-${release.id}`}
          style={{ backgroundColor: "#eef6ff", borderRadius: 8, padding: 12, marginBottom: 8 }}
        >
          <Text style={{ fontWeight: "bold" }}>{`Novo set: ${release.setName}!`}</Text>
          <Pressable
            testID={`home-set-release-dismiss-${release.id}`}
            onPress={() => handleDismiss(release.id)}
            style={{ marginTop: 4 }}
          >
            <Text style={{ color: "#0a66c2" }}>Ok, entendi</Text>
          </Pressable>
        </View>
      ))}
      <FlatList
        testID="home-news-list"
        data={news}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text>Nenhuma notícia por enquanto. Volte mais tarde!</Text>}
        renderItem={({ item }) => (
          <Pressable
            testID={`home-news-item-${item.id}`}
            onPress={() => handleOpenNews(item.url)}
            style={{ paddingVertical: 8 }}
          >
            <Text style={{ fontWeight: "bold" }}>{item.title}</Text>
            {item.summary ? <Text>{item.summary}</Text> : null}
            <Text style={{ color: "#666" }}>{`${item.source} — ${formatDate(item.publishedAt)}`}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

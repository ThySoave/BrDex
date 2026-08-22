import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { createMeetup, listUpcomingMeetups, type Meetup } from "../../src/features/meetups/meetupsRepository";

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function MeetupsScreen() {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMeetups = useCallback(
    () =>
      listUpcomingMeetups()
        .then(setMeetups)
        .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar encontros"))
        .finally(() => setLoading(false)),
    []
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadMeetups().finally(() => setRefreshing(false));
  };

  useEffect(() => {
    loadMeetups();
  }, [loadMeetups]);

  const handleCreate = () => {
    const startsAt = new Date(date);
    if (!title.trim() || !city.trim() || Number.isNaN(startsAt.getTime())) {
      Alert.alert("Preencha título, cidade e uma data válida (AAAA-MM-DD)");
      return;
    }

    // Mesmo corte da listagem (gte(now)): encontro no passado nunca apareceria.
    if (startsAt.getTime() < Date.now()) {
      Alert.alert("A data do encontro precisa ser futura");
      return;
    }

    createMeetup({ title: title.trim(), city: city.trim(), startsAt: startsAt.toISOString(), description: null })
      .then(() => {
        setTitle("");
        setCity("");
        setDate("");
        loadMeetups();
      })
      .catch((err: Error) => Alert.alert("Erro", err.message));
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
      <TextInput testID="meetup-title" placeholder="Título do encontro" value={title} onChangeText={setTitle} />
      <TextInput testID="meetup-city" placeholder="Cidade" value={city} onChangeText={setCity} />
      <TextInput testID="meetup-date" placeholder="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} />
      <Pressable testID="meetup-create" accessibilityRole="button" onPress={handleCreate} style={{ marginVertical: 8 }}>
        <Text>Publicar encontro</Text>
      </Pressable>
      {loading ? (
        <Text testID="meetups-loading" style={{ color: "#666", marginTop: 16 }}>
          Carregando...
        </Text>
      ) : (
      <FlatList
        testID="meetups-list"
        data={meetups}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <Text testID="meetups-empty" style={{ color: "#666", marginTop: 16 }}>
            Nenhum encontro publicado por enquanto. Publique o primeiro usando o formulário acima.
          </Text>
        }
        renderItem={({ item }) => (
          <View testID={`meetup-${item.id}`} style={{ paddingVertical: 8 }}>
            <Text style={{ fontWeight: "bold" }}>{item.title}</Text>
            <Text>{`${item.city} — ${formatDate(item.startsAt)}`}</Text>
            {item.description ? <Text style={{ color: "#666" }}>{item.description}</Text> : null}
          </View>
        )}
      />
      )}
    </View>
  );
}

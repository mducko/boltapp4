import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SettingItem {
  title: string;
  description?: string;
  action: () => void;
  destructive?: boolean;
}

interface SettingsSectionProps {
  title: string;
  items: SettingItem[];
}

export function SettingsSection({ title, items }: SettingsSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>
      
      <View style={styles.itemsContainer}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.item,
              index < items.length - 1 && styles.itemBorder,
            ]}
            onPress={item.action}
          >
            <View>
              <Text style={[
                styles.itemTitle,
                item.destructive && styles.destructiveText,
              ]}>
                {item.title}
              </Text>
              {item.description && (
                <Text style={styles.itemDescription}>
                  {item.description}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  itemsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  item: {
    padding: 16,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  itemTitle: {
    fontSize: 16,
    color: '#000',
  },
  itemDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  destructiveText: {
    color: '#ff3b30',
  },
});
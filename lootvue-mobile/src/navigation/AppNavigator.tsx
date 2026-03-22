import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Home,
  Globe,
  BarChart2,
  Sliders,
  Plus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { FeedScreen } from '../screens/FeedScreen';
import { MarketsScreen } from '../screens/MarketsScreen';
import { NewDealScreen } from '../screens/NewDealScreen';
import { DealsScreen } from '../screens/DealsScreen';
import { SimScreen } from '../screens/SimScreen';
import { DealDetailScreen } from '../screens/DealDetailScreen';
import { colors, spacing, fontSize, radius } from '../theme';

// -------------------------------------------------------
// Navigation types
// -------------------------------------------------------

export type HomeStackParamList = {
  FeedMain: undefined;
  DealDetail: { dealId: string };
};

export type TabParamList = {
  Feed: undefined;
  Markets: undefined;
  NewDeal: undefined;
  Deals: undefined;
  Sim: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

// -------------------------------------------------------
// Home Stack (Feed + DealDetail)
// -------------------------------------------------------

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="FeedMain" component={FeedScreen} />
      <HomeStack.Screen
        name="DealDetail"
        component={DealDetailScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </HomeStack.Navigator>
  );
}

// -------------------------------------------------------
// Custom Tab Bar
// -------------------------------------------------------

interface TabBarProps {
  state: { index: number; routes: { name: string; key: string }[] };
  descriptors: Record<string, { options: { tabBarLabel?: string; title?: string } }>;
  navigation: { emit: (args: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
}

function CustomTabBar({ state, navigation }: TabBarProps) {
  const tabs = [
    { name: 'Feed', Icon: Home, label: 'Feed' },
    { name: 'Markets', Icon: Globe, label: 'Markets' },
    { name: 'NewDeal', Icon: null, label: '' }, // FAB
    { name: 'Deals', Icon: BarChart2, label: 'Deals' },
    { name: 'Sim', Icon: Sliders, label: 'Sim' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab, index) => {
        const isFocused = state.index === index;
        const isCenter = tab.name === 'NewDeal';

        const onPress = () => {
          Haptics.selectionAsync();
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[index].key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(tab.name);
          }
        };

        if (isCenter) {
          return (
            <View key={tab.name} style={styles.fabContainer}>
              <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel="Analyze new deal"
                style={styles.fabWrapper}
              >
                <LinearGradient
                  colors={[colors.gold, colors.goldLight]}
                  style={styles.fab}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Plus size={26} color="#000" aria-hidden />
                </LinearGradient>
              </Pressable>
            </View>
          );
        }

        const IconComponent = tab.Icon!;
        const color = isFocused ? colors.gold : colors.textDisabled;

        return (
          <Pressable
            key={tab.name}
            style={styles.tabItem}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={tab.label}
          >
            <IconComponent size={22} color={color} aria-hidden />
            <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// -------------------------------------------------------
// Dark nav theme
// -------------------------------------------------------

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    border: colors.border,
    text: colors.textPrimary,
    primary: colors.gold,
    notification: colors.rose,
  },
};

// -------------------------------------------------------
// Root navigator
// -------------------------------------------------------

export function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...(props as unknown as TabBarProps)} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Feed" component={HomeStackNavigator} />
        <Tab.Screen name="Markets" component={MarketsScreen} />
        <Tab.Screen name="NewDeal" component={NewDealScreen} />
        <Tab.Screen name="Deals" component={DealsScreen} />
        <Tab.Screen name="Sim" component={SimScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    height: 64,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 44,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabWrapper: {
    marginBottom: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

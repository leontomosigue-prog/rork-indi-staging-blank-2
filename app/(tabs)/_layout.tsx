import { Tabs, Redirect } from "expo-router";
import { Home, User, ShoppingBag, MessageSquare, Truck, Wrench, Package, BookOpen, Users, UserCircle, ClipboardList } from "lucide-react-native";
import React from "react";
import Colors from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const isAdmin = user.roles?.includes('Admin');
  const isEmployee = user.type === 'employee';

  if (isAdmin) {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          headerShown: true,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Início",
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="catalog"
          options={{
            title: "Catálogo",
            tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="employees"
          options={{
            title: "Colaboradores",
            tabBarIcon: ({ color }) => <Users size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: "Clientes",
            tabBarIcon: ({ color }) => <UserCircle size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="tickets"
          options={{
            title: "Chamados",
            tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "Mensagens",
            tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color }) => <User size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="sales"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="rental"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="parts"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="technical"
          options={{
            href: null,
          }}
        />
      </Tabs>
    );
  }

  if (isEmployee) {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          headerShown: true,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Início",
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="tickets"
          options={{
            title: "Chamados",
            tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "Mensagens",
            tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color }) => <User size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="sales"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="rental"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="parts"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="technical"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="catalog"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="employees"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            href: null,
          }}
        />
      </Tabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Vendas",
          tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rental"
        options={{
          title: "Locação",
          tabBarIcon: ({ color }) => <Truck size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="parts"
        options={{
          title: "Peças",
          tabBarIcon: ({ color }) => <Package size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="technical"
        options={{
          title: "Assistência",
          tabBarIcon: ({ color }) => <Wrench size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Mensagens",
          tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

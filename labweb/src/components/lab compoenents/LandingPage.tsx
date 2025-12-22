
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole } from "@/types/user";
import { Microscope, Stethoscope, Users, FlaskConical } from "lucide-react";

interface LandingPageProps {
  onRoleSelect: (role: UserRole) => void;
}

const LandingPage = ({ onRoleSelect }: LandingPageProps) => {
  const roles = [
    {
      id: "lab-technician" as UserRole,
      title: "Lab Technician",
      description: "Manage samples, conduct tests, and input results",
      icon: Microscope,
      color: "bg-blue-500",
    },
    {
      id: "doctor" as UserRole,
      title: "Doctor",
      description: "View patient results, request tests, and analyze reports",
      icon: Stethoscope,
      color: "bg-green-500",
    },
    {
      id: "patient" as UserRole,
      title: "Patient",
      description: "View test results, track status, and download reports",
      icon: Users,
      color: "bg-purple-500",
    },
    {
      id: "researcher" as UserRole,
      title: "Researcher",
      description: "Access anonymized data and conduct research studies",
      icon: FlaskConical,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            MedSync Lab Management System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive laboratory management solution for healthcare professionals,
            patients, and researchers. Choose your role to get started.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role) => {
            const IconComponent = role.icon;
            return (
              <Card
                key={role.id}
                className="hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
                onClick={() => onRoleSelect(role.id)}
              >
                <CardHeader className="text-center">
                  <div className={`${role.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{role.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {role.description}
                  </CardDescription>
                  <Button className="w-full mt-4" variant="outline">
                    Enter Portal
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Secure • HIPAA Compliant • Real-time Sync
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

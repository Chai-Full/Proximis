"use client";
import React, { useEffect, useState } from "react";
import "./home/index.css";
import Link from "next/link";
import HomeIcon from '@mui/icons-material/Home';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import PermIdentityIcon from '@mui/icons-material/PermIdentity';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import HomeContent from "./home/page";
import { AnnouncementContent } from "./announcement/page";

const navItems = [
        { id: "home", label: "Accueil", icon: HomeIcon, href: "/" },
        { id: "messages", label: "Messages", icon: MailOutlineIcon, href: "/messages" },
        { id: "publish", label: "Publier", icon: AddCircleIcon, href: "/publish" },
        { id: "annonces", label: "Créer une Annonces", icon: TextSnippetIcon, href: "/annonces" },
        { id: "profil", label: "Profil", icon: PermIdentityIcon, href: "/profil" }
        ];

// Table de correspondance id -> composant de contenu
const contentComponents = {
  home: HomeContent,
  messages: HomeContent,
  publish: HomeContent,
  annonces: AnnouncementContent,
  profil: HomeContent
};

type PageKey = keyof typeof contentComponents;

export default function BaseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const [currentPage, setcurrentPage] = useState<PageKey>("home");
    const currentNav = navItems.find(item => item.id === currentPage);
    const CurrentContent = contentComponents[currentPage] || HomeContent;
    
    let title = "Accueil"
    useEffect(() => {
        window.history.replaceState(null, "/home", "");
    }, []);
    return (
        <div className="container">
            <div className="head">
                <span className="title">{currentNav?.label ?? "Accueil"}</span>
                {
                    currentPage === "annonces" && 
                    <>
                        
                    </>
                }
            </div>
            <main className="mainContent">
                <CurrentContent />
            </main>
            <nav className="bottomBar">
                {navItems.map(({ id, label, icon: Icon, href }) => (
                    <div
                        key={id}
                        className={`navItem ${currentPage === id ? "active" : ""}`}
                        onClick={() => setcurrentPage(id as PageKey)}
                        >
                        <Icon 
                            color="primary" 
                            fontSize={currentPage === id ? "large" : "medium"} 
                        />
                        <Link href="#" className="navLink">{label}</Link>
                    </div>
                ))}
                </nav>
        </div>
    );
}
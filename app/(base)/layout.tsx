"use client";
import React, { useEffect, useState } from "react";
import "./home/index.css";
import Link from "next/link";
import HomeIcon from '@mui/icons-material/Home';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import PermIdentityIcon from '@mui/icons-material/PermIdentity';
import AddCircleIcon from '@mui/icons-material/AddCircle';

const navItems = [
        { id: "home", label: "Accueil", icon: HomeIcon, href: "/" },
        { id: "messages", label: "Messages", icon: MailOutlineIcon, href: "/messages" },
        { id: "publish", label: "Publier", icon: AddCircleIcon, href: "/publish" },
        { id: "annonces", label: "Annonces", icon: TextSnippetIcon, href: "/annonces" },
        { id: "profil", label: "Profil", icon: PermIdentityIcon, href: "/profil" }
        ];

export default function BaseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const [currentPage, setcurrentPage] = useState("home")
    
    let title = "Accueil"
    useEffect(() => {
        window.history.replaceState(null, "/home", "");
    }, []);
    return (
        <div className="container">
            <div className="head">
                <span className="title">{title}</span>
            </div>
            <main className="mainContent">
                {children}
            </main>
            <nav className="bottomBar">
                {navItems.map(({ id, label, icon: Icon, href }) => (
                    <div
                        key={id}
                        className={`navItem ${currentPage === id ? "active" : ""}`}
                        onClick={() => setcurrentPage(id)}
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
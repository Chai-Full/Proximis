"use client";
import React, { useEffect } from "react";
import "./home/index.css";
import Link from "next/link";
import HomeIcon from '@mui/icons-material/Home';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PermIdentityIcon from '@mui/icons-material/PermIdentity';
import HomeContent from "./home/page";
import { SubmitHandler, useForm } from "react-hook-form";
import { InputsAnnounceSearch } from "../types/InputsAnnounceSearch";
import AnnouncementContent from "./announcement/page";
import AnnounceDetails from "./announcement/AnnouncementDetails";
import ProfileDetails from "./profile/profileDetails";
import EditAnnouncementContent from "./announcement/EditAnnouncementContent";
import ProfileEditContent from "./profile/EditProfileContent";
import { ContentProvider, useContent, PageKey } from "./ContentContext";
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import { useRouter } from 'next/navigation';
import { SearchOutlined } from "@mui/icons-material";
import PublishAnnouncementContent from "./publish_announcement/page";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import AnnouncementSearchPageContent from "./search/AnnouncementSearchPageContent";
import FilterPageContent from "./search/FilterPageContent";
import ReservationContent from "./reservation/page";
import MessageContent from "./message/page";
import ChatContent from "./message/ChatContent";
import TodayIcon from '@mui/icons-material/Today';
import MyAnnouncementsContent from "./my_announcements/page";
import EvaluateContent from "./evaluate/page";
import ReviewsContent from "./reviews/page";

const navItems = [
        { id: "home", label: "Accueil", icon: HomeIcon, href: "/" },
        { id: "messages", label: "Messages", icon: MailOutlineIcon, href: "/messages" },
        { id: "search", label: "Rechercher", icon: SearchOutlined, href: "/search" },
        { id: "annonces", label: "Réservations", icon: TodayIcon, href: "/annonces" },
        { id: "profil", label: "Profil", icon: PermIdentityIcon, href: "/profil" }
        ];

// Table de correspondance id -> composant de contenu
const contentComponents = {
    home: HomeContent,
    messages: MessageContent,
    message_chat: ChatContent,
    search: AnnouncementSearchPageContent,
    filters: FilterPageContent,
    reservation: ReservationContent,
    annonces: AnnouncementContent,
    announce_details: AnnounceDetails,
    announce_edit: EditAnnouncementContent,
    profil: ProfileDetails,
    profil_edit: ProfileEditContent,
    publish: PublishAnnouncementContent,
    my_announcements: MyAnnouncementsContent,
    evaluate: EvaluateContent,
    reviews: ReviewsContent,
};

// Inner component consumes the ContentContext (must be inside ContentProvider)
function BaseLayoutInner({ children }: Readonly<{ children: React.ReactNode }>) {
    const { currentPage, setCurrentPage, history, goBack, headerTitle, setHeaderTitle, setSelectedProfileId, currentUserId, setCurrentUserId, selectedAnnouncementId, reservationDraft } = useContent();
    const router = useRouter();
    const currentNav = navItems.find(item => item.id === currentPage);
    const CurrentContent = (contentComponents as Record<string, React.ComponentType>)[currentPage] || HomeContent;
    const hideBottomNav = currentPage === "messages" || currentPage === "message_chat" || currentPage === "annonces" || currentPage === "profil" || currentPage === "profil_edit" || currentPage === "my_announcements" || currentPage === "announce_details" || currentPage === "evaluate" || currentPage === "reviews" || currentPage === "publish";
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
      } = useForm<InputsAnnounceSearch>();
      const onSubmit: SubmitHandler<InputsAnnounceSearch> = (data) => console.log(data);

    // Track if component is mounted to avoid hydration mismatch
    const [mounted, setMounted] = React.useState(false);

    useEffect(() => {
        setMounted(true);
        window.history.replaceState(null, "/home", "");
    }, []);
    const title = headerTitle ?? currentNav?.label ?? "Accueil";

    return (
        <div className="container">
            <div
                className="head"
                style={{
                    // Remove shadow on search page to blend with search header
                    boxShadow: currentPage === "search" ? "none" : undefined,
                }}
            >
                {(history.length > 0 || 
                  (currentPage === 'reservation' && (selectedAnnouncementId || reservationDraft)) ||
                  (currentPage === 'profil' && history.length === 0) ||
                  (currentPage === 'my_announcements' && history.length === 0) ||
                  (currentPage === 'announce_details' && history.length === 0)) ? (
                    <button
                        aria-label="back"
                        className="backButton"
                        onClick={() => {
                            // If on reservation page without history but with selectedAnnouncementId, go to announce_details
                            if (currentPage === 'reservation' && history.length === 0 && selectedAnnouncementId) {
                                setCurrentPage('announce_details');
                            } 
                            // If on profil, my_announcements, or announce_details without history, go to home
                            else if ((currentPage === 'profil' || currentPage === 'my_announcements' || currentPage === 'announce_details') && history.length === 0) {
                                setCurrentPage('home');
                            } 
                            else {
                                goBack();
                            }
                        }}
                        style={{
                            position: "absolute",
                            left: 16,
                            top: "50%",
                            transform: "translateY(-50%)",
                        }}
                    >
                        <ArrowBackOutlined color="primary" sx={{ cursor: "pointer" }} />
                    </button>
                ) : null}
                <span className="title T4" style={{ textAlign: "center" }}>
                    {title}
                </span>
                {/* logout button on the right when user is logged in and on home page */}
                {/* Only render after mount to avoid hydration mismatch */}
                {mounted && currentUserId != null && currentPage === "home" && (
                    <button
                        aria-label="logout"
                        className="backButton"
                        onClick={async () => {
                            try {
                                // Call logout endpoint
                                await fetch('/api/logout', { method: 'POST' });
                            } catch (e) {
                                // ignore
                            }
                            // Remove token and userId from localStorage
                            try {
                                localStorage.removeItem('proximis_userId');
                                localStorage.removeItem('proximis_token');
                            } catch (e) {
                                // ignore
                            }
                            setCurrentUserId && setCurrentUserId(null);
                            router.push('/');
                        }}
                        style={{
                            position: "absolute",
                            right: 16,
                            top: "50%",
                            transform: "translateY(-50%)",
                        }}
                    >
                        <LogoutOutlined color="primary" sx={{ cursor: "pointer" }} />
                    </button>
                )}
            </div>
                <main className="mainContent" style={{ marginBottom: hideBottomNav ? 0 : undefined }}>
                    <CurrentContent />
                </main>
                {!hideBottomNav && (
                    <nav className="bottomBar">
                    {navItems.map(({ id, label, icon: Icon, href }) => (
                        <div
                            key={id}
                            className={`navItem ${currentPage === id ? "active" : ""}`}
                               onClick={() => {
                                   if (id === 'profil') {
                                       // when user clicks the navbar profile, show the connected user's profile (by id)
                                       if (setSelectedProfileId) setSelectedProfileId(currentUserId ?? null);
                                       // Ensure history includes home if coming from bottom nav
                                       if ((currentPage as PageKey) !== 'profil') {
                                           if (history.length === 0 && currentPage === 'home') {
                                               setCurrentPage('profil', ['home']);
                                           } else {
                                               setCurrentPage('profil');
                                           }
                                       }
                                   } else if (id === 'annonces') {
                                       // when user clicks "Réservations" in bottom nav, go to reservations view in MyAnnouncementsContent
                                       if (typeof window !== "undefined") {
                                           localStorage.setItem("proximis_myAnnouncements_view", "reservations");
                                       }
                                       // Ensure history includes home if coming from bottom nav
                                       if ((currentPage as PageKey) !== 'my_announcements') {
                                           if (history.length === 0 && currentPage === 'home') {
                                               setCurrentPage('my_announcements', ['home']);
                                           } else {
                                               setCurrentPage('my_announcements');
                                           }
                                       }
                                   } else {
                                       setCurrentPage(id as PageKey);
                                   }
                               }}
                            >
                            <Icon 
                                color={currentPage !== id ? "primary" : "secondary"}
                                fontSize={currentPage === id ? "large" : "medium"} 
                            />
                            <Link href="#" className="navLink">{label}</Link>
                        </div>
                    ))}
                    </nav>
                )}
        </div>
    );
}

export default function BaseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <ContentProvider>
            <BaseLayoutInner>{children}</BaseLayoutInner>
        </ContentProvider>
    );
}
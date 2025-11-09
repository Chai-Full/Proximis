"use client";

import AddIcon from '@mui/icons-material/Add';
import Image from 'next/image';
import { Button } from '@mui/material';
import { useContent } from '../ContentContext';
import { LightbulbCircleOutlined, Schedule, StarBorderOutlined, StarOutlineOutlined, StarOutlineSharp, Today } from '@mui/icons-material';
import AnnouncementCard from '../announcement/announcementCard';
import announcements from '../../../data/announcements.json';
import StarsOutlined from '@mui/icons-material/StarsOutlined';

export default function HomeContent() {
    const { currentPage, setCurrentPage } = useContent();
    const announcementAvailability = [
        { day: "Lun", available: true },
        { day: "Mar", available: false },
    ];
    const stats = [
        { label: "Services rendus", value: "12" },
        { label: "Services reçus", value: "8" },
        { label: "Note moyenne", value: "4.8" },
    ]
    return (
        <>
           <div className="homeContainer">
            {/* {
                (Array.isArray(navItems) ? navItems : []).map(({ id, label, icon: Icon }) => (
                    <div
                    key={id}
                    className="homeRedirectItem"
                    >
                        <Icon style={{ color: '#ff9202', fontSize: 40 }} />
                        <span>{label}</span>
                    </div>
                ))
            } */}
                <Button 
                    fullWidth 
                    variant="contained"
                    color='secondary'
                    startIcon={<AddIcon sx={{ color: "white" }} />}
                    sx={{ borderRadius: "15px", color: 'white'}}
                    onClick={() =>{
                        setCurrentPage("publish");
                    }}
                    >
                    Publier une annonce
                </Button>
                <div className='nextRDV'>
                    <div className='nextRDVC1'>
                        <div className='nextRDVC1Title'>
                            <Today sx={{ color: "white" }}/>
                            <span className='T1'>Prochain RDV</span>
                        </div>
                        <div className='nextRDVBadge'><span className='T6'>demain</span></div>
                    </div>
                    <div className='nextRDVC2'>
                        <span className='T4'>Aide informatique avec Marie D.</span>
                    </div>
                    <div className='nextRDVC3'>
                        <div style={{ display: 'flex', columnGap: "3px"}}>
                            <Schedule sx={{ color: "white"}}/>
                            <span className='T7'>15 oct. 2025 - 15:00</span>
                        </div>
                    </div>
                </div>
                <div className='announcementsPromoted'>
                    <div className='announcementsPromotedHeader'>
                        <LightbulbCircleOutlined sx={{ color: "#ff9202"}}/>
                        <span className='T2'>Annonces recommandée</span>
                    </div>
                    <AnnouncementCard announcement={announcements[0]}/>
                </div>
                <div className='anouncementActionRequire'>
                    <div style={{display: 'flex', alignItems: 'center', columnGap: "5px"}}>
                        <StarOutlineOutlined sx={{ color: "#ff9202"}}/>
                        <span className='T2'>Annonces à évaluer</span>
                    </div>
                    <span className='T4'>Service de cuisine à domicile par Jean P.</span>
                    <span className='T6' style={{ color: "#8c8c8c"}}>
                        Complété le 10 oct. 2025
                    </span>
                    <div className='anouncementActionRequireBtn' onClick={() => {}}>
                        <span className='T6'>Action requise</span>
                    </div>
                </div>
                <div className='statsRecap'>
                    <div style={{display: 'flex', alignItems: 'center', columnGap: "5px"}}>
                        <StarsOutlined  sx={{ color: "#1ea792"}}/>
                        <span className='T2'>Vos statistiques</span>
                    </div>

                    <div className='statsRecapContent'>
                        {stats.map(({ label, value }) => (
                            <div key={label} className='statsRecapItem'>
                                <span style={{color: "#03A689"}}>{value}</span>
                                <span className='T7' style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'wrap', flex: 1 }}>{label}</span>
                            </div>
                        ))}
                    </div>
            </div>
        </div>
            {/* <div className="slider">
                <div className="slide">
                    <Image src="photo1.svg" width={500} height={300} alt="Annonce 1" />
                </div>
                <div className="slide">
                    <Image src="photo1.svg" width={500} height={300} alt="Annonce 2" />
                </div>
                <div className="slide">
                    <Image src="photo1.svg" width={500} height={300} alt="Annonce 3" />
                </div>
            </div> */}
        </>
    );
}
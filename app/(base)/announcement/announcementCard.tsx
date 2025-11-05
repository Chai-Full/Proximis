import LocationOn from '@mui/icons-material/LocationOn';
import Star from '@mui/icons-material/Star';
import React from 'react'
import './index.css';

interface AnnouncementCardProps {
    announcementAvailability: { day: string; available: boolean }[];
}

const AnnouncementCard = ({ announcementAvailability }: AnnouncementCardProps) => {
  return (
    <div className='announcementCard'>
        <div className='announcementCardImage'>
            {/* <Image src="photo1.svg" width={100} height={1000} alt="Annonce 1" /> */}
        </div>
        <div className='announcementCardContent'>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <span
                    className='T5'
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                >
                    Entretien electrique
                </span>
                <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
                    <Star sx={{ color: "#FFE135" }} />
                    <span className='T5'>5</span>
                </div>
            </div>    <div className='announcementAvailability'>
                {announcementAvailability.map(({ day, available }) => (
                    available === true && <div key={day}>
                        <span className='T6'>{day}</span>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <LocationOn sx={{ color: "#8c8c8c"}}/>
                    <span className='T6' style={{color: "#8c8c8c"}}>à 3km</span>
                </div>
                <span className='T4'>25 €/h</span>
            </div>
        </div>
    </div>
  )
}

export default AnnouncementCard
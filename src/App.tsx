/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Music, Mail, Sparkles, Camera, Image as ImageIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- CONFIGURATION (TÙY CHỈNH THÔNG TIN TẠI ĐÂY) ---
const SENDER = "Hùng"; // Tên của bạn
const RECIPIENT = "Thuỳ"; // Tên của người nhận (Crush)
const START_DATE = new Date("2026-03-09T00:00:00"); // Ngày kỷ niệm/Quen biết (Định dạng: YYYY-MM-DD)

// Cấu hình hiệu ứng cánh hoa anh đào
const CHERRY_BLOSSOM_CONFIG = {
  COUNT: 50,        // Số lượng cánh hoa
  MIN_SPEED: 0.5,   // Tốc độ rơi tối thiểu
  MAX_SPEED: 1.5,   // Tốc độ rơi tối đa
  MIN_SIZE: 8,      // Kích thước tối thiểu
  MAX_SIZE: 18,     // Kích thước tối đa
};

const TIMELINE_EVENTS = [
  { year: "09/03/2026", title: "Facebook Dating", desc: "Lần đầu nhắn trên Facebook Dating" },
  { year: "10/03/2026", title: "Messenger", desc: "Bắt đầu nhắn trên Messenger" },
  { year: "24/03/2026", title: "Gặp mặt", desc: "Lần đầu gặp nhau ở ngoài đời thực" },
  { year: "03/04/2026", title: "Hẹn hò", desc: "Hẹn hò đầu tiên" }
];

// --- MORPHING PARTICLE SYSTEM (Effect from Video 015) ---

interface Particle {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  vx: number; // Tốc độ X
  vy: number; // Tốc độ Y
  r: number;
  color: string;
  trailLength: number; // Độ dài đuôi
  isCollected?: boolean; // Hạt đã rơi vào bình chưa
}

const MorphingParticles = ({ textSequence, onJarFull }: { textSequence: string[], onJarFull?: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particles = useRef<Particle[]>([]);
  const stageIndex = useRef(-1);
  const lastStageTime = useRef(0);
  const fillLevel = useRef(0); // Mức nước trong bình (0-100)
  const isJarFull = useRef(false);
  const jarOpacity = useRef(1);

  const STAGE_DURATION = 2500; // 2.5s mỗi trạng thái
  const PARTICLE_COUNT = 1500;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Khởi tạo hạt ban đầu
    const initParticles = () => {
      const p: Particle[] = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        p.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: (Math.random() - 0.5) * 500,
          tx: Math.random() * canvas.width,
          ty: Math.random() * canvas.height,
          tz: 0,
          vx: Math.random() * 2 + 8,
          vy: Math.random() * 2 + 8,
          r: Math.random() * 2 + 0.5,
          color: 'rgba(255, 255, 255, 0.8)',
          trailLength: Math.random() * 20 + 10,
          isCollected: false
        });
      }
      particles.current = p;
    };
    initParticles();

    // Hàm lấy tọa độ điểm từ Text
    const getTextPoints = (text: string) => {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = 600;
      tempCanvas.height = 300;
      
      tempCtx.fillStyle = 'black';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.fillStyle = 'white';
      tempCtx.font = `bold ${text.length > 5 ? '80px' : '150px'} "Dancing Script", serif`;
      tempCtx.textAlign = 'center';
      tempCtx.textBaseline = 'middle';
      tempCtx.fillText(text, 300, 150);

      const data = tempCtx.getImageData(0, 0, 600, 300).data;
      const points: {x: number, y: number}[] = [];
      for (let y = 0; y < 300; y += 4) {
        for (let x = 0; x < 600; x += 4) {
          if (data[(y * 600 + x) * 4] > 128) {
            points.push({
              x: (x - 300) * 1.5 + canvas.width / 2,
              y: (y - 150) * 1.5 + canvas.height / 2.5
            });
          }
        }
      }
      return points;
    };

    // Hàm lấy tọa độ điểm từ Trái tim
    const getHeartPoints = () => {
      const points: {x: number, y: number}[] = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = Math.random() * Math.PI * 2;
        const r = 13;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        points.push({
          x: x * r + canvas.width / 2,
          y: y * r + canvas.height / 2.5
        });
      }
      return points;
    };

    // Hàm lấy tọa độ cho cảnh Mưa sao băng (Meteor Shower)
    const getMeteorPoints = () => {
      const points: {x: number, y: number}[] = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        points.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height
        });
      }
      return points;
    };

    const nextStage = () => {
      // Chỉ còn stage mưa sao băng
      stageIndex.current = 0;
      const newPoints = getMeteorPoints();

      particles.current.forEach((p, i) => {
        const target = newPoints[i % newPoints.length];
        p.tx = target.x;
        p.ty = target.y;
        p.tz = (Math.random() - 0.5) * 40;
        
        // Khởi tạo màu ban đầu (Hồng)
        p.color = '#ff85a1';
      });
      
      lastStageTime.current = Date.now();
    };

    const animate = () => {
      // Làm sạch canvas với hiệu ứng mờ dần để tạo vết (trail)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Xử lý hiệu ứng mờ dần của bình
      if (isJarFull.current) {
        jarOpacity.current = Math.max(0, jarOpacity.current - 0.03);
      }

      // Thông số bình (Jar Redesign - More detailed and elegant)
      const jarWidth = 140;
      const jarHeight = 200;
      const jarX = canvas.width / 2;
      const jarY = canvas.height - 180;

      // Chỉ vẽ bình nếu nó còn hiển thị
      if (jarOpacity.current > 0) {
        ctx.save();
        ctx.globalAlpha = jarOpacity.current;
        
        // Vẽ hiệu ứng phản chiếu/glow cho bình
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(255, 182, 193, 0.4)';

        // Vẽ bình (Elegantly Curved Jar)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        // Bottom (Curved)
        ctx.moveTo(jarX - jarWidth / 4, jarY + jarHeight / 2);
        ctx.quadraticCurveTo(jarX, jarY + jarHeight * 0.55, jarX + jarWidth / 4, jarY + jarHeight / 2);
        
        // Right side curve (Belly)
        ctx.bezierCurveTo(jarX + jarWidth / 1.6, jarY + jarHeight / 2, jarX + jarWidth / 1.6, jarY - jarHeight / 6, jarX + jarWidth / 5, jarY - jarHeight / 2.5);
        
        // Neck & Mouth (Right)
        ctx.lineTo(jarX + jarWidth / 4, jarY - jarHeight / 2);
        ctx.bezierCurveTo(jarX + jarWidth / 5, jarY - jarHeight * 0.55, jarX - jarWidth / 5, jarY - jarHeight * 0.55, jarX - jarWidth / 4, jarY - jarHeight / 2);
        
        // Neck & Mouth (Left)
        ctx.lineTo(jarX - jarWidth / 5, jarY - jarHeight / 2.5);

        // Left side curve (Belly)
        ctx.bezierCurveTo(jarX - jarWidth / 1.6, jarY - jarHeight / 6, jarX - jarWidth / 1.6, jarY + jarHeight / 2, jarX - jarWidth / 4, jarY + jarHeight / 2);
        
        ctx.stroke();
        
        // Vẽ thêm vân thủy tinh mờ ảo
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(jarX - jarWidth / 8, jarY - jarHeight / 3);
        ctx.bezierCurveTo(jarX - jarWidth / 2.5, jarY, jarX - jarWidth / 2.5, jarY + jarHeight / 3, jarX - jarWidth / 8, jarY + jarHeight / 2.1);
        ctx.stroke();

        // Vẽ cổ bình thanh thoát hơn
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.moveTo(jarX - jarWidth / 5, jarY - jarHeight / 2.4);
        ctx.lineTo(jarX + jarWidth / 5, jarY - jarHeight / 2.4);
        ctx.stroke();
        
        // Vẽ highlight phản chiếu trên thủy tinh
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 4;
        ctx.arc(jarX - jarWidth / 4, jarY, jarHeight / 3, Math.PI * 0.8, Math.PI * 1.2);
        ctx.stroke();

        ctx.shadowBlur = 0; // Reset shadow

        // Vẽ "nước" trong bình (Đổi sang màu HỒNG lãng mạn)
        if (fillLevel.current > 0) {
          const currentFillHeight = (fillLevel.current / 100) * jarHeight * 0.9;
          const fy = jarY + jarHeight / 2;
          
          ctx.save();
          // Clip to jar shape for water
          ctx.beginPath();
          ctx.moveTo(jarX - jarWidth / 3, jarY + jarHeight / 2);
          ctx.lineTo(jarX + jarWidth / 3, jarY + jarHeight / 2);
          ctx.bezierCurveTo(jarX + jarWidth / 1.8, jarY + jarHeight / 2, jarX + jarWidth / 1.8, jarY - jarHeight / 4, jarX + jarWidth / 6, jarY - jarHeight / 2.2);
          ctx.lineTo(jarX - jarWidth / 6, jarY - jarHeight / 2.2);
          ctx.bezierCurveTo(jarX - jarWidth / 1.8, jarY - jarHeight / 4, jarX - jarWidth / 1.8, jarY + jarHeight / 2, jarX - jarWidth / 3, jarY + jarHeight / 2);
          ctx.clip();

          const gradient = ctx.createLinearGradient(0, fy - currentFillHeight, 0, fy);
          gradient.addColorStop(0, '#ffb6c1'); // Light Pink
          gradient.addColorStop(0.5, '#ff85a1'); // Pink
          gradient.addColorStop(1, '#d53f8c'); // Deep Pink
          ctx.fillStyle = gradient;
          ctx.globalAlpha = 0.6 * jarOpacity.current;
          ctx.fillRect(jarX - jarWidth / 2, fy - currentFillHeight, jarWidth, currentFillHeight);
          
          // Thêm bọt khí lung linh trong bình
          for(let b=0; b<5; b++) {
            const bx = jarX + (Math.random() - 0.5) * jarWidth * 0.6;
            const by = fy - Math.random() * currentFillHeight;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(bx, by, Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Add water surface shimmer
          ctx.beginPath();
          ctx.moveTo(jarX - jarWidth / 2, fy - currentFillHeight);
          ctx.lineTo(jarX + jarWidth / 2, fy - currentFillHeight);
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }

      // Cập nhật và vẽ hạt
      particles.current.forEach(p => {
        if (!p.isCollected) {
          // Hiệu ứng rơi 45 độ từ trái sang phải mượt mà hơn
          p.x += p.vx;
          p.y += p.vy;

          // Kiểm tra va chạm với bình (Rough proximity for collection)
          if (
            p.x > jarX - jarWidth / 2 && 
            p.x < jarX + jarWidth / 2 && 
            p.y > jarY - jarHeight / 2 && 
            p.y < jarY + jarHeight / 2
          ) {
            if (!isJarFull.current) {
              p.isCollected = true;
              fillLevel.current = Math.min(100, fillLevel.current + 0.15);
              if (fillLevel.current >= 100) {
                isJarFull.current = true;
                if (onJarFull) onJarFull();
                confetti({
                  particleCount: 150,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#ff85a1', '#d53f8c', '#ffffff']
                });
              }
            }
          }
        } else {
          // Hạt đã thu thập lắng xuống
          p.y += 1.5; 
          if (p.y > jarY + jarHeight / 2) {
            p.isCollected = false; // Respawn
            p.y = -50;
            p.x = Math.random() * canvas.width - 200;
          }
        }
        
        // Chuyển màu rực rỡ hơn
        const ratio = Math.min(Math.max(p.y / canvas.height, 0), 1);
        const rValue = Math.round(255 * (1 - ratio) + 255 * ratio);
        const gValue = Math.round(133 * (1 - ratio) + 180 * ratio);
        const bValue = Math.round(161 * (1 - ratio) + 220 * ratio);
        p.color = `rgb(${rValue}, ${gValue}, ${bValue})`;
        
        // Reset hạt nếu rơi khỏi màn hình
        if (p.y > canvas.height + 50 || p.x > canvas.width + 50) {
          p.isCollected = false;
          if (Math.random() > 0.5) {
            p.y = -50;
            p.x = Math.random() * canvas.width - 200;
          } else {
            p.x = -50;
            p.y = Math.random() * canvas.height - 200;
          }
          p.vx = Math.random() * 3 + 6;
          p.vy = p.vx + (Math.random() - 0.5) * 1;
        }
        
        p.z += (Math.random() - 0.5) * 2;

        const scale = 400 / (400 + p.z);
        const x2d = (p.x - canvas.width / 2) * scale + canvas.width / 2;
        const y2d = (p.y - canvas.height / 2) * scale + canvas.height / 2;

        if (!p.isCollected) {
          ctx.beginPath();
          const trailGrad = ctx.createLinearGradient(x2d, y2d, x2d - 15 * scale, y2d - 15 * scale);
          trailGrad.addColorStop(0, p.color);
          trailGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.strokeStyle = trailGrad;
          ctx.lineWidth = p.r * scale;
          ctx.lineCap = 'round';
          ctx.moveTo(x2d, y2d);
          ctx.lineTo(x2d - 15 * scale, y2d - 15 * scale);
          ctx.stroke();

          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(x2d, y2d, p.r * 1.2 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    nextStage();
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [textSequence]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }} />;
};

// Component Hiệu ứng nền chúc mừng rạng rỡ
const CelebratoryBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`pulse-${i}`}
          className="absolute rounded-full"
          style={{
            background: i === 0 
              ? 'radial-gradient(circle, rgba(255,133,161,0.2) 0%, transparent 70%)' 
              : i === 1
              ? 'radial-gradient(circle, rgba(213,63,140,0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 70%)',
            width: `${60 + i * 20}vw`,
            height: `${60 + i * 20}vw`,
            left: i === 0 ? '-10%' : i === 1 ? '50%' : '30%',
            top: i === 0 ? '-10%' : i === 1 ? '40%' : '70%',
            filter: 'blur(60px)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8 + i * 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Component Timeline Kỷ Niệm
const RomanticTimeline = () => {
  return (
    <div className="mt-16 w-full max-w-2xl px-4">
      <div className="relative">
        <div className="space-y-12">
          {TIMELINE_EVENTS.map((event, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className={`flex items-center justify-between w-full ${index % 2 === 0 ? 'flex-row-reverse' : ''}`}
            >
              <div className="w-5/12"></div>
              <div className="z-10 bg-deep-pink w-4 h-4 rounded-full border-4 border-white shadow-sm"></div>
              <div className="w-5/12 glass-container p-4 rounded-2xl border-white/40 shadow-md backdrop-blur-md">
                <span className="text-[10px] font-bold text-deep-pink tracking-widest">{event.year}</span>
                <h3 className="font-serif text-lg text-text-main font-bold mt-1">{event.title}</h3>
                <p className="text-xs text-text-main/70 mt-2 leading-relaxed italic">{event.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Subtle Sparkle Particles for the button
const SparkleParticles = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="sparkle-particle"
          style={{
            width: Math.random() * 3 + 1 + 'px',
            height: Math.random() * 3 + 1 + 'px',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            background: i % 2 === 0 ? '#ffffff' : '#ffd700',
            borderRadius: i % 3 === 0 ? '0%' : '50%', // Star or circle
            rotate: 45,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
            y: [0, -30, -60],
            x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20],
            rotate: [45, 135, 225],
          }}
          transition={{
            duration: Math.random() * 1.5 + 1.5,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};
const CONFESSION_TEXT = `Gửi chị Thuỳ thân mến,

Em viết những dòng này không phải vì cảm hứng nhất thời, mà là sự tích tụ của bao cảm xúc dồn nén bấy lâu. 

Mọi chuyện bắt đầu từ nụ cười tỏa nắng của chị, cái nụ cười đã xua tan đi sự mệt mỏi trong em ngay lần đầu mình gặp mặt. Càng tiếp xúc, em lại càng bị cuốn hút bởi sự thông minh, tinh tế và trái tim ấm áp luôn biết thấu hiểu của chị. 

Chúng mình đã đi qua rất nhiều ngày tháng, có buồn, có vui, và có cả những thầm lặng. Nhưng dù thế nào, hình bóng chị vẫn luôn là điều đẹp đẽ nhất trong tâm trí em. 

Hôm nay em muốn lấy hết can đảm để hỏi chị một điều mà em đã ấp ủ từ lâu...`;

const BIRTHDAY_WISH_TEXT = `Chúc mừng sinh nhật chị – người đã khiến thế giới của em trở nên rực rỡ và ấm áp hơn. Cảm ơn chị đã luôn ở đây, yêu thương và che chở cho em. Chúc người yêu của em một tuổi mới thật hạnh phúc, bình an và mãi là điểm tựa vững chắc nhất của em nhé. Yêu chị rất nhiều! <3`;

const MUSIC_URL = "/nhac.mp3"; // File nhạc cục bộ

// --- CONFIGURATION CHO THÔNG ĐIỆP NGẪU NHIÊN ---
const ROMANTIC_MESSAGES = [
  "Chị là điều tuyệt vời nhất của em",
  "Yêu chị mãi mãi ❤️",
  "Hạnh phúc là khi có chị",
  "Chị là cả thế giới của em",
  "Em sẽ luôn ở bên chị",
  "Cảm ơn chị đã đến bên em",
  "Trái tim em chỉ có chị thôi",
  "Mãi bên nhau nhé chị Thuỳ!",
  "Cùng nhau già đi chị nhé",
  "Chị là công chúa của em",
  "Thế giới của em nhỏ bé, chỉ vừa đủ chứa mình chị",
  "Cảm ơn vì đã là một phần thanh xuân của em",
  "Nụ cười của chị là liều thuốc chữa lành mọi mệt mỏi",
  "Mỗi ngày được trò chuyện cùng chị đều là ngày đẹp trời",
  "Em yêu cách chị quan tâm và thấu hiểu em",
  "Dù mai sau thế nào, em vẫn sẽ chọn chị",
  "Chị xinh đẹp nhất khi là chính mình",
  "Trong mắt em, chị luôn tỏa sáng theo cách riêng",
  "Yêu chị là điều đúng đắn nhất em từng làm",
  "Hẹn ước cùng chị đi hết đoạn đường này nhé",
  "Mỗi nhịp đập trái tim em đều gọi tên chị",
  "Chị là lý do để em nỗ lực mỗi ngày",
  "Gặp được chị là định mệnh, yêu chị là hạnh phúc",
  "Mong rằng chúng mình sẽ có thật nhiều kỷ niệm đẹp",
  "Chị là bình yên mà em luôn tìm kiếm",
  "Trời xanh mây trắng, còn em chỉ cần chị",
  "Nắm tay em thật chặt, đừng buông nhé chị Thuỳ",
  "Dành cả trí nhớ này để khắc ghi hình bóng chị",
  "Yêu chị từ những điều giản đơn nhất",
  "Cảm ơn chị vì đã kiên nhẫn bên em",
  "Chị là món quà vô giá mà cuộc đời tặng cho em",
  "Chỉ cần có chị, bão giông cũng hóa dịu dàng",
  "Mọi con đường em đi đều muốn có chị kề bên",
  "Thương chị nhiều hơn cả lời nói",
  "Chị là bình minh rực rỡ trong ngày của em",
  "Yêu chị là hơi thở, là nhịp đập, là cuộc sống",
  "Em nguyện là cái bóng, mãi âm thầm bảo vệ chị",
  "Có chị, đời em không còn là những bản nhạc buồn",
  "Chị là bến đỗ bình yên sau bao ngày giông bão",
  "Tình yêu dành cho chị là vô tận như vũ trụ này",
  "Mỗi ánh mắt chị trao đều khiến lòng em xao xuyến",
  "Chị là mảnh ghép hoàn hảo nhất đời em",
  "Yêu chị, em học được cách trân trọng từng phút giây",
  "Chân thành cảm ơn chị vì đã chọn em",
  "Dù thế giới có đổi thay, tình em vẫn vẹn nguyên",
  "Cầu mong mọi điều tốt đẹp nhất sẽ đến với chị",
  "Chị chính là định nghĩa hoàn hảo nhất của tình yêu",
  "Mỗi sớm mai thức dậy, người đầu tiên em nghĩ đến là chị",
  "Có chị bên cạnh, em chẳng sợ hãi điều chi",
  "Chị là ngôi sao lấp lánh nhất trong bầu trời của em",
  "Cảm ơn chị vì đã làm cho cuộc đời em thêm rực rỡ",
  "Yêu chị là điều tuyệt vời nhất từng xảy đến với em",
  "Em sẽ nắm tay chị đi qua mọi thăng trầm cuộc đời",
  "Mỗi khoảnh khắc bên chị đều là một phép màu",
  "Chị là báu vật mà em luôn nâng niu",
  "Cảm ơn chị đã biến những ngày bình thường thành đặc biệt",
  "Yêu chị là sứ mệnh cả đời của em",
  "Trong vạn người, em chỉ thấy mình chị",
  "Chị là nguồn cảm hứng vô tận của em",
  "Mỗi nụ cười của chị đều là một đóa hoa nở trong tim em",
  "Yêu chị là lựa chọn sáng suốt nhất đời em",
  "Em sẽ là bờ vai để chị dựa vào lúc mệt mỏi",
  "Chị là thanh xuân, là hiện tại và là tương lai của em",
  "Có chị, cuộc đời em mới thực sự trọn vẹn",
  "Chị là ánh sáng soi đường cho trái tim em",
  "Yêu chị là một hành trình ngọt ngào nhất",
  "Hạnh phúc đơn giản là được nhìn thấy chị mỗi ngày",
  "Chị là người duy nhất em muốn cùng già đi",
  "Trái tim em đã tìm thấy bến đỗ nơi chị"
];

const POPUP_CONFIG = {
  INTERVAL: 1200, // Tốc độ xuất hiện (ms)
  DURATION: 3000, // Thời gian tồn tại của mỗi tin nhắn (ms)
  MAX_POPUPS: 12,  // Số lượng tin nhắn tối đa cùng lúc
};

// --- COMPONENTS ---

// Component Bầu trời sao lấp lánh & Cánh hoa anh đào
const StarBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Sao lấp lánh */}
      {[...Array(80)].map((_, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute bg-white rounded-full"
          style={{
            width: Math.random() * 2 + 1,
            height: Math.random() * 2 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.5 + 0.3,
          }}
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}
      <CherryBlossomBackground />
    </div>
  );
};

// Component hiển thị các thông điệp lãng mạn ngẫu nhiên
const RomanticPopups = ({ active }: { active: boolean }) => {
  const [messages, setMessages] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    const spawnMessage = () => {
      setMessages(prev => {
        if (prev.length >= POPUP_CONFIG.MAX_POPUPS) return prev;
        
        // Tìm một tin nhắn chưa xuất hiện trên màn hình
        const currentTexts = prev.map(m => m.text);
        const availableMessages = ROMANTIC_MESSAGES.filter(text => !currentTexts.includes(text));
        
        // Nếu hết tin nhắn chưa dùng thì lấy đại 1 cái, còn không thì ưu tiên cái mới
        const pool = availableMessages.length > 0 ? availableMessages : ROMANTIC_MESSAGES;
        const randomText = pool[Math.floor(Math.random() * pool.length)];

        const colors = ['#ffe4e6', '#fce7f3', '#fef3c7', '#ecfdf5', '#eff6ff'];
        const newId = idRef.current++;
        const newMessage = {
          id: newId,
          text: randomText,
          x: Math.random() * 75 + 10, 
          y: Math.random() * 75 + 10,
          color: colors[Math.floor(Math.random() * colors.length)]
        };

        // Lập lịch xóa tin nhắn này sau đúng thời gian DURATION
        setTimeout(() => {
          setMessages(current => current.filter(m => m.id !== newId));
        }, POPUP_CONFIG.DURATION);

        return [...prev, newMessage];
      });
    };

    const intervalId = setInterval(spawnMessage, POPUP_CONFIG.INTERVAL);
    return () => clearInterval(intervalId);
  }, [active]);

  return (
    <div className="fixed inset-0 pointer-events-none z-20">
      <AnimatePresence>
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="absolute p-4 rounded-2xl shadow-lg border border-white/50 backdrop-blur-sm font-serif italic text-text-main text-sm md:text-base pointer-events-none"
            style={{
              left: `${m.x}%`,
              top: `${m.y}%`,
              backgroundColor: m.color,
            }}
          >
            {m.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Floating Cherry Blossom Background using Canvas
const CherryBlossomBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let petals: { 
      x: number; 
      y: number; 
      size: number; 
      speed: number; 
      opacity: number; 
      swing: number; 
      swingSpeed: number;
      rotation: number;
      rotationSpeed: number;
    }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < CHERRY_BLOSSOM_CONFIG.COUNT; i++) {
      petals.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * (CHERRY_BLOSSOM_CONFIG.MAX_SIZE - CHERRY_BLOSSOM_CONFIG.MIN_SIZE) + CHERRY_BLOSSOM_CONFIG.MIN_SIZE,
        speed: Math.random() * (CHERRY_BLOSSOM_CONFIG.MAX_SPEED - CHERRY_BLOSSOM_CONFIG.MIN_SPEED) + CHERRY_BLOSSOM_CONFIG.MIN_SPEED,
        opacity: Math.random() * 0.6 + 0.2,
        swing: Math.random() * 2,
        swingSpeed: Math.random() * 0.02 + 0.01,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      });
    }

    const drawPetal = (x: number, y: number, size: number, opacity: number, rotation: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      
      // Draw a cherry blossom petal shape (simple ellipse with a notch)
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-size / 2, -size / 2, -size, size / 3, 0, size);
      ctx.bezierCurveTo(size, size / 3, size / 2, -size / 2, 0, 0);
      
      // Color: Soft pastel pink/white
      const gradient = ctx.createRadialGradient(0, size / 2, 0, 0, size / 2, size);
      gradient.addColorStop(0, `rgba(255, 220, 230, ${opacity})`);
      gradient.addColorStop(1, `rgba(255, 182, 193, ${opacity * 0.8})`);
      
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      petals.forEach((p) => {
        p.y += p.speed;
        p.x += Math.sin(p.swing) * 0.5;
        p.swing += p.swingSpeed;
        p.rotation += p.rotationSpeed;

        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.x < -20) p.x = canvas.width + 20;

        drawPetal(p.x, p.y, p.size, p.opacity, p.rotation);
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="heart-bg" style={{ zIndex: 0 }} />;
};

// Countdown Timer
const TimeCounter = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - START_DATE.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex gap-3 justify-center">
      <div className="time-unit-box">
        <span className="block text-xl font-bold text-text-main leading-none">{timeLeft.days}</span>
        <label className="text-[10px] text-gray-400 uppercase tracking-tighter">Ngày</label>
      </div>
      <div className="time-unit-box">
        <span className="block text-xl font-bold text-text-main leading-none">{timeLeft.hours}</span>
        <label className="text-[10px] text-gray-400 uppercase tracking-tighter">Giờ</label>
      </div>
      <div className="time-unit-box">
        <span className="block text-xl font-bold text-text-main leading-none">{timeLeft.minutes}</span>
        <label className="text-[10px] text-gray-400 uppercase tracking-tighter">Phút</label>
      </div>
      <div className="time-unit-box">
        <span className="block text-xl font-bold text-text-main leading-none">{timeLeft.seconds}</span>
        <label className="text-[10px] text-gray-400 uppercase tracking-tighter">Giây</label>
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  const [state, setState] = useState<'intro' | 'confession' | 'question' | 'success' | 'birthday-wish' | 'the-end'>('intro');
  const [displayedText, setDisplayedText] = useState("");
  const [birthdayDisplayText, setBirthdayDisplayText] = useState("");
  const [showMusic, setShowMusic] = useState(false);
  const [noButtonStyle, setNoButtonStyle] = useState<CSSProperties>({});
  const [showSuccessMessages, setShowSuccessMessages] = useState(true);
  const [romanticMessageVisible, setRomanticMessageVisible] = useState(false);
  const [isMessageClicked, setIsMessageClicked] = useState(false);
  const letterScrollRef = useRef<HTMLDivElement>(null);
  
  // Auto scroll logic for confession text
  useEffect(() => {
    if (letterScrollRef.current) {
      letterScrollRef.current.scrollTop = letterScrollRef.current.scrollHeight;
    }
  }, [displayedText, state]);

  // Success message timer
  useEffect(() => {
    if (state === 'success') {
      const msgTimer = setTimeout(() => {
        setShowSuccessMessages(false);
      }, 7000);
      return () => clearTimeout(msgTimer);
    } else {
      setShowSuccessMessages(true);
    }
  }, [state]);
  
  // Confetti trigger on success
  useEffect(() => {
    if (state === 'success') {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // Bắn pháo hoa hình trái tim và sắc màu rực rỡ
        const scalar = 2;
        const heart = confetti.shapeFromPath({ path: 'M167 430c-75 0-107-77-107-108 0-33 18-94 54-137 30-35 130-145 130-145s100 110 130 145c36 43 54 104 54 137 0 31-32 108-107 108-70 0-77-58-77-58s-7 58-77 58z' });

        confetti({ 
          ...defaults, 
          particleCount, 
          shapes: [heart, 'circle', 'square'],
          colors: ['#ff85a1', '#d53f8c', '#ffd700', '#ffffff'],
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } 
        });
        confetti({ 
          ...defaults, 
          particleCount, 
          shapes: [heart, 'circle', 'square'],
          colors: ['#ff85a1', '#d53f8c', '#ffd700', '#ffffff'],
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } 
        });
      }, 250);

      return () => clearInterval(interval);
    }
    
    // Tự động chuyển sang "The End" sau khi chúc sinh nhật xong (người dùng tự quyết hoặc timer)
    if (state === 'birthday-wish') {
      const timer = setTimeout(() => {
        setState('the-end');
      }, 30000); // 30s cho lời chúc sinh nhật
      return () => clearTimeout(timer);
    }
  }, [state]);

  const handleRomanticMessageClick = () => {
    if (isMessageClicked) return;
    setIsMessageClicked(true);
    
    // Phát ra hạt lấp lánh màu hồng phấn
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      confetti({
        particleCount: 15,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#ffb6c1', '#ffd1dc', '#ffffff']
      });
    }, 100);

    // Sau khi nổ xong thì sang state chúc mừng sinh nhật
    setTimeout(() => {
      setState('birthday-wish');
    }, 2500);
  };

  // Typewriter effect
  useEffect(() => {
    // Typewriter effect for confession
    if (state === 'confession') {
      let index = 0;
      const interval = setInterval(() => {
        setDisplayedText(CONFESSION_TEXT.slice(0, index));
        index++;
        if (index > CONFESSION_TEXT.length) {
          clearInterval(interval);
          setTimeout(() => setState('question'), 2000);
        }
      }, 50);
      return () => clearInterval(interval);
    }

    // Typewriter effect for birthday wish
    if (state === 'birthday-wish') {
      let index = 0;
      const interval = setInterval(() => {
        setBirthdayDisplayText(BIRTHDAY_WISH_TEXT.slice(0, index));
        index++;
        if (index > BIRTHDAY_WISH_TEXT.length) {
          clearInterval(interval);
        }
      }, 40);
      return () => clearInterval(interval);
    }
  }, [state]);

  const handleOpenLetter = () => {
    setState('confession');
    setShowMusic(true);
  };

  const moveNoButton = () => {
    const x = Math.random() * (window.innerWidth - 100);
    const y = Math.random() * (window.innerHeight - 50);
    setNoButtonStyle({
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
      zIndex: 1000,
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
      <StarBackground />
      <RomanticPopups active={state === 'success'} />

      <div className="fixed top-12 left-12 text-gold-accent text-3xl opacity-60 z-10 pointer-events-none">✦</div>
      <div className="fixed bottom-12 right-12 text-gold-accent text-3xl opacity-60 z-10 pointer-events-none">✦</div>

      {/* Background Music */}
      {showMusic && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-4 glass-container py-2 px-4 rounded-full shadow-lg border-white/50">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="music-disc"
          >
            {/* Vinyl texture / Image */}
            <img 
              src="/hung-thuy.jpg" 
              className="w-full h-full object-cover opacity-60"
              alt="Music Disc"
              referrerPolicy="no-referrer"
            />
            <div className="music-disc-center absolute inset-2 mx-auto my-auto flex items-center justify-center">
               <Music className="w-2 h-2 text-deep-pink" />
            </div>
          </motion.div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-deep-pink uppercase tracking-widest">Now Playing</span>
            <span className="text-xs font-semibold text-text-main truncate max-w-[100px]">Giai điệu tình yêu</span>
          </div>
          <audio src={MUSIC_URL} autoPlay loop />
        </div>
      )}

      <AnimatePresence mode="wait">
        {state === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="text-center z-10"
          >
            <motion.div 
              animate={{ y: [0, -10, 0], rotate: [0, -2, 2, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="inline-block p-8 rounded-full bg-white/40 backdrop-blur-md shadow-2xl mb-8 border border-white/60"
            >
              <Mail className="w-20 h-16 text-deep-pink" strokeWidth={1} />
            </motion.div>
            <h1 className="font-serif text-4xl md:text-5xl text-text-main mb-6 leading-relaxed italic">
              Gửi chị Thuỳ xinh đẹp...
            </h1>
            <p className="font-sans text-deep-pink/60 mb-10 tracking-[0.3em] uppercase text-[10px] font-bold">
              Một bức thư từ Hùng
            </p>
            <button
              onClick={handleOpenLetter}
              className="group relative px-14 py-5 bg-deep-pink text-white rounded-full font-bold text-lg shadow-xl hover:scale-105 transition-all active:scale-95"
            >
              <span className="relative z-10">Mở thư tình</span>
              <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 blur-xl transition-opacity"></div>
            </button>
          </motion.div>
        )}

        {(state === 'confession' || state === 'question') && (
          <motion.div
            key="content-card"
            initial={{ opacity: 0, scale: 1.1, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="max-w-5xl w-full glass-container rounded-[40px] overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] z-10 min-h-[600px] shadow-2xl"
          >
            {/* Left Pane: Visuals & Counter */}
            <div className="bg-white/20 p-8 flex flex-col items-center justify-center text-center border-b lg:border-b-0 lg:border-r border-white/40">
              <div className="photo-frame mb-10">
                <div className="w-[240px] h-[240px] bg-pink-50 rounded-lg flex items-center justify-center overflow-hidden border border-pink-100">
                  <img 
                    src="/hung-thuy.jpg" 
                    alt="Kỷ niệm Hùng và Thuỳ"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-deep-pink font-bold opacity-70">
                  Thời gian bên nhau
                </p>
                <TimeCounter />
              </div>
              
              <div className="mt-12 text-gold-accent text-5xl opacity-40 animate-pulse">❤</div>
            </div>

            {/* Right Pane: Letter & Interaction */}
            <div 
              ref={letterScrollRef}
              className="p-10 md:p-14 flex flex-col max-h-[600px] overflow-y-auto scroll-smooth custom-scrollbar"
            >
              <div className="flex-grow">
                <h2 className="font-serif text-3xl text-deep-pink mb-8 italic">Gửi chị Thuỳ xinh đẹp,</h2>
                <div className="font-serif text-lg md:text-xl text-text-main/90 leading-relaxed whitespace-pre-wrap min-h-[300px]">
                  {state === 'confession' ? (
                    <>
                      {displayedText}
                      <span className="typewriter-cursor"></span>
                    </>
                  ) : (
                    CONFESSION_TEXT
                  )}
                </div>
              </div>

              <AnimatePresence>
                {state === 'question' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 pt-8 border-t border-white/40"
                  >
                    <p className="font-serif text-2xl font-bold text-deep-pink mb-8">
                      Chị Thuỳ ơi, làm người yêu em nhé?
                    </p>
                    <div className="flex flex-wrap gap-6 items-center">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const heart = confetti.shapeFromPath({ path: 'M167 430c-75 0-107-77-107-108 0-33 18-94 54-137 30-35 130-145 130-145s100 110 130 145c36 43 54 104 54 137 0 31-32 108-107 108-70 0-77-58-77-58s-7 58-77 58z' });
                          confetti({
                            particleCount: 80,
                            spread: 70,
                            origin: { y: 0.6 },
                            shapes: [heart],
                            colors: ['#ff85a1', '#d53f8c', '#ffffff']
                          });
                          setState('success');
                        }}
                        className="px-12 py-4 bg-deep-pink text-white rounded-full font-bold text-lg shadow-lg shadow-pink-200 transition-all flex items-center gap-2 group relative overflow-hidden active:scale-95 hover:bg-pink-600 hover-glow-pulse"
                      >
                        {/* Sparkle Particles on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <SparkleParticles />
                        </div>

                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                          <div className="animate-shimmer absolute inset-0"></div>
                        </div>

                        <span className="relative z-10 flex items-center gap-2">
                          Đồng ý <Heart className="w-5 h-5 fill-white group-hover:animate-pulse" />
                        </span>
                      </motion.button>
                      
                      <button
                        onMouseEnter={moveNoButton}
                        onClick={moveNoButton}
                        style={noButtonStyle}
                        className="px-5 py-2 bg-slate-100 text-slate-400 rounded-full text-xs font-medium border border-slate-200 transition-all opacity-60"
                      >
                        Không nha...
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {!state.includes('question') && (
                <div className="mt-8 flex justify-end">
                  <p className="font-script text-4xl text-deep-pink opacity-80">- {SENDER}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.7, filter: 'brightness(1.5)' }}
            animate={{ opacity: 1, scale: 1, filter: 'brightness(1)' }}
            exit={{ 
              opacity: 0, 
              filter: 'blur(40px) brightness(1.5)', 
              scale: 1.1,
              transition: { duration: 1.2 }
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="fixed inset-0 z-10 w-full flex flex-col items-center overflow-hidden no-scrollbar"
            style={{ 
              background: 'linear-gradient(180deg, #1a0b0e 0%, #2d0a15 50%, #000000 100%)' 
            }}
          >
            <CelebratoryBackground />
            <MorphingParticles 
              textSequence={['3', '2', '1', 'Hùng ❤️ Thuỳ', 'Mãi bên nhau']} 
              onJarFull={() => setTimeout(() => setRomanticMessageVisible(true), 1500)}
            />
            
            <div className="relative z-10 w-full flex flex-col items-center py-20 min-h-screen">
              <AnimatePresence>
                {showSuccessMessages && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 1 }}
                    className="mt-[40vh]"
                  >
                    <h1 className="font-serif text-5xl md:text-7xl text-white mb-6 tracking-tight px-4 leading-tight">
                      Cảm ơn chị nhiều lắm!
                    </h1>
                    <p className="font-script text-5xl md:text-6xl text-deep-pink mb-14 drop-shadow-sm px-4">
                      {SENDER} yêu {RECIPIENT} rất nhiều! ❤️
                    </p>

                    <RomanticTimeline />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Thông điệp lãng mạn tương tác */}
              <AnimatePresence>
                {romanticMessageVisible && !isMessageClicked && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ 
                      opacity: 1, 
                      y: [40, 0, -20],
                      transition: {
                        opacity: { duration: 2 },
                        y: { duration: 10, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
                      }
                    }}
                    exit={{ opacity: 0, y: -200, scale: 1.1, filter: "blur(10px)" }}
                    transition={{ duration: 2.5 }}
                    onClick={handleRomanticMessageClick}
                    className="fixed inset-0 flex items-center justify-center p-6 cursor-pointer z-20 group"
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      animate={isMessageClicked ? { x: [-1, 1, -1, 1, 0] } : {}}
                      className="text-center max-w-4xl"
                    >
                      <h2 className="font-serif italic text-3xl md:text-5xl text-white leading-relaxed drop-shadow-[0_0_15px_rgba(255,182,193,0.8)] px-4">
                        Giữa biển mây vô tận, em chỉ muốn nắm tay chị, để cả đời này không còn lạc mất nhau
                      </h2>
                      <p className="mt-8 text-white/40 text-xs uppercase tracking-widest animate-pulse">
                        Nhấn vào đây chị nhé...
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {state === 'birthday-wish' && (
          <motion.div
            key="birthday-wish"
            initial={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="fixed inset-0 z-10 flex items-center justify-center p-6 text-center overflow-hidden"
            style={{ 
              background: 'radial-gradient(circle at center, #2d0a15 0%, #000000 100%)' 
            }}
          >
            <CelebratoryBackground />
            {/* Lớp hạt ánh sáng bay lơ lửng cho state này */}
            <div className="absolute inset-0 z-0">
               {[...Array(30)].map((_, i) => (
                 <motion.div
                   key={i}
                   className="absolute bg-pink-200/30 rounded-full blur-sm"
                   animate={{
                     y: [Math.random() * 1000, -100],
                     x: [Math.random() * 1000, Math.random() * 1000 + 100],
                     opacity: [0, 1, 0]
                   }}
                   transition={{
                     duration: Math.random() * 5 + 5,
                     repeat: Infinity,
                     delay: Math.random() * 10
                   }}
                   style={{
                     width: Math.random() * 20 + 5,
                     height: Math.random() * 20 + 5,
                     left: `${Math.random() * 100}%`
                   }}
                 />
               ))}
            </div>

            <div className="relative z-10 max-w-4xl px-4 flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.5, delay: 0.5 }}
              >
                <Heart className="w-16 h-16 text-deep-pink mb-8 animate-pulse mx-auto" />
                <h2 className="font-serif italic text-2xl md:text-3xl text-white leading-relaxed mb-10">
                  {birthdayDisplayText}
                </h2>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                whileHover={{ opacity: 0.8, scale: 1.05 }}
                onClick={() => setState('the-end')}
                className="mt-16 text-[10px] uppercase tracking-[0.5em] text-white border-b border-white/20 pb-1"
              >
                Kết thúc hành trình này
              </motion.button>
            </div>
          </motion.div>
        )}
        
        {state === 'the-end' && (
          <motion.div
            key="the-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-center"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.8, y: 0 }}
              transition={{ delay: 1, duration: 2 }}
              className="font-serif text-6xl md:text-8xl text-white italic tracking-widest"
            >
              The End
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 3, duration: 2 }}
              className="mt-10 font-sans text-xs uppercase tracking-[1em] text-white"
            >
              Hẹn gặp lại chị trong giấc mơ
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credits / Footer */}
      <div className="fixed bottom-6 left-0 w-full text-center pointer-events-none z-10">
        <p className="text-[10px] uppercase tracking-[0.4em] text-deep-pink/40 font-bold">
          MADE WITH LOVE BY HUNG 2026
        </p>
      </div>
    </div>
  );
}


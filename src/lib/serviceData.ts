import type { StaticImageData } from 'next/image';
import seoImage from '@/webhd/Cong-Cu-SEO-1-1-768x512.jpg';
import adsImage from '@/webhd/Cach-Tang-Traffic-Cho-Website-2-768x512.jpg';
import careImage from '@/webhd/Cong-Cu-Kiem-Tra-Bai-Viet-Chuan-SEO-15-768x512.jpg';

export type ServiceDetail = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  detail: string;
  image: StaticImageData;
  bullets: string[];
  process: string[];
  reasons: string[];
};

export const services: ServiceDetail[] = [
  {
    slug: 'website-care',
    title: 'Chăm sóc Website',
    eyebrow: 'Dịch vụ chăm sóc website',
    summary: 'Duy trì website ổn định, cập nhật nội dung đều đặn, tối ưu SEO và xử lý lỗi kỹ thuật kịp thời.',
    detail:
      'Dịch vụ chăm sóc website phù hợp với doanh nghiệp đã có website nhưng thiếu người quản trị thường xuyên. Thanh Phúc Coder hỗ trợ kiểm tra tổng thể, cập nhật nội dung, tối ưu tốc độ, bảo mật cơ bản và theo dõi hiệu quả để website luôn sẵn sàng phục vụ khách hàng.',
    image: careImage,
    bullets: ['Cập nhật bài viết và banner', 'Kiểm tra lỗi hiển thị', 'Tối ưu tốc độ tải trang', 'Backup và bảo trì định kỳ'],
    process: ['Tiếp nhận tình trạng website', 'Kiểm tra tổng thể', 'Lập kế hoạch chăm sóc', 'Tối ưu kỹ thuật', 'Cập nhật nội dung', 'Báo cáo và theo dõi'],
    reasons: ['Website luôn mới và đáng tin cậy', 'Giảm rủi ro lỗi kỹ thuật', 'Hỗ trợ SEO và chuyển đổi tốt hơn'],
  },
  {
    slug: 'google-ads',
    title: 'Quảng Cáo Google Ads',
    eyebrow: 'Dịch vụ quảng cáo Google Ads',
    summary: 'Tiếp cận khách hàng đang có nhu cầu tìm kiếm, tối ưu ngân sách và tăng tỷ lệ chuyển đổi.',
    detail:
      'Google Ads giúp doanh nghiệp xuất hiện đúng thời điểm khách hàng đang tìm sản phẩm hoặc dịch vụ. Dịch vụ tập trung vào lựa chọn từ khóa, cấu trúc chiến dịch, nội dung quảng cáo, landing page và đo lường chuyển đổi để ngân sách được dùng hiệu quả hơn.',
    image: adsImage,
    bullets: ['Nghiên cứu từ khóa mua hàng', 'Thiết lập chiến dịch', 'Tối ưu chi phí mỗi chuyển đổi', 'Báo cáo hiệu quả rõ ràng'],
    process: ['Phân tích sản phẩm và mục tiêu', 'Nghiên cứu từ khóa', 'Xây dựng chiến dịch', 'Thiết lập đo lường', 'Theo dõi và tối ưu', 'Báo cáo kết quả'],
    reasons: ['Có khách hàng tiềm năng nhanh', 'Dễ kiểm soát ngân sách', 'Đo lường được hiệu quả thực tế'],
  },
  {
    slug: 'seo',
    title: 'SEO',
    eyebrow: 'Dịch vụ SEO website',
    summary: 'Tối ưu website, nội dung và cấu trúc từ khóa để tăng khả năng xuất hiện tự nhiên trên Google.',
    detail:
      'SEO là hướng tăng trưởng bền vững cho website. Thanh Phúc Coder triển khai từ kiểm tra kỹ thuật, nghiên cứu từ khóa, tối ưu nội dung, internal link đến theo dõi thứ hạng để website có nền tảng tìm kiếm tốt hơn.',
    image: seoImage,
    bullets: ['Audit kỹ thuật website', 'Nghiên cứu bộ từ khóa', 'Tối ưu nội dung chuẩn SEO', 'Theo dõi thứ hạng và traffic'],
    process: ['Khảo sát website hiện tại', 'Phân tích từ khóa', 'Tối ưu cấu trúc trang', 'Xây dựng nội dung', 'Theo dõi thứ hạng', 'Cải thiện liên tục'],
    reasons: ['Tăng traffic tự nhiên', 'Xây dựng uy tín dài hạn', 'Giảm phụ thuộc vào quảng cáo trả phí'],
  },
];

export const getServiceBySlug = (slug: string) => services.find((service) => service.slug === slug);
